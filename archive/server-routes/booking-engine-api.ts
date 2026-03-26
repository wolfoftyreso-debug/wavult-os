// ============================================================
// BOOKING ENGINE — Headless, API-first
// "We don't book time. We allocate reality."
// ============================================================
//
// === CAPACITY ENGINE ===
// Knows: technician skills, working hours, current load, PIX history
// Computes: what CAN be booked (not what slots are "free")
//
// === INTENT LAYER ===
// Customer says: "Service + Bromsar / VW Golf"
// Engine translates → estimated_minutes (PIX-driven), required_skills, required_parts
//
// === ALLOCATION ENGINE ===
// Given intent + capacity: computes best allocation
// Factors: delay_risk, load_balance, skill_match, continuity (same tech as before)
// ============================================================

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";
import { sendGenericSMS } from "./sms-service";

const router = Router();

// ============================================================
// MOCK DATA — Demo for Lindqvists Bilverkstad
// ============================================================

const DEMO_ORG_ID = "00020002-0000-0000-0000-000000000001";

const DEMO_TECHNICIANS = [
  {
    id: "tech-robin-001",
    name: "Robin Björk",
    skills: ["SERVICE", "BRAKES", "TYRES", "INSPECTION"],
    specialty_makes: ["Volvo", "SAAB"],
    work_start: "08:00",
    work_end: "17:00",
  },
  {
    id: "tech-eric-001",
    name: "Eric Karlsson",
    skills: ["DIAGNOSTICS", "REPAIR", "INSPECTION", "SERVICE"],
    specialty_makes: ["BMW", "Mercedes", "Audi"],
    work_start: "08:00",
    work_end: "17:00",
  },
  {
    id: "tech-jonas-001",
    name: "Jonas Lindström",
    skills: ["SERVICE", "BRAKES", "DIAGNOSTICS", "TYRES", "REPAIR", "INSPECTION"],
    specialty_makes: [], // All makes
    work_start: "08:00",
    work_end: "17:00",
  },
];

// Service → required skills mapping
const SERVICE_SKILLS: Record<string, string[]> = {
  SERVICE: ["SERVICE"],
  BRAKES: ["BRAKES"],
  DIAGNOSTICS: ["DIAGNOSTICS"],
  TYRES: ["TYRES"],
  REPAIR: ["REPAIR"],
  INSPECTION: ["INSPECTION"],
  OTHER: [],
};

// ============================================================
// ALLOCATION ALGORITHM
// ============================================================

interface Intent {
  service_type: string;
  vehicle_make?: string;
  vehicle_year?: number;
  vehicle_reg?: string;
  preference: "ASAP" | "THIS_WEEK" | "SPECIFIC_DATE" | "NO_PREFERENCE";
  preferred_date?: string;
  customer_phone?: string;
  org_id: string;
}

interface AllocationCandidate {
  technician_id: string;
  technician_name: string;
  date: string;
  start_time: string;
  end_time: string;
  estimated_minutes: number;
  smart_buffer_added: number;
  delay_risk_pct: number;
  delay_risk_reason: string;
  load_pct: number;
  score: number;
  reason: string;
  estimate_basis: "PIX_HISTORY" | "STANDARD";
  estimate_confidence: number;
}

// Get time estimate from DB (PIX-history or standard)
async function getTimeEstimate(
  service_type: string,
  vehicle_make: string | undefined,
  org_id: string
): Promise<{ minutes: number; basis: "PIX_HISTORY" | "STANDARD"; confidence: number; p80: number }> {
  // Try make-specific first
  if (vehicle_make) {
    const { data } = await supabase
      .from("service_time_estimates")
      .select("*")
      .eq("org_id", org_id)
      .eq("service_type", service_type)
      .eq("vehicle_make", vehicle_make)
      .single();

    if (data && data.sample_count > 10) {
      return {
        minutes: data.median_minutes,
        basis: "PIX_HISTORY",
        confidence: Math.min(90, 50 + data.sample_count),
        p80: data.p80_minutes || data.median_minutes + 30,
      };
    }
  }

  // Fallback: generic estimate
  const { data } = await supabase
    .from("service_time_estimates")
    .select("*")
    .eq("org_id", org_id)
    .eq("service_type", service_type)
    .is("vehicle_make", null)
    .single();

  if (data) {
    return {
      minutes: data.median_minutes,
      basis: data.sample_count > 5 ? "PIX_HISTORY" : "STANDARD",
      confidence: data.sample_count > 5 ? 70 : 60,
      p80: data.p80_minutes || data.median_minutes + 30,
    };
  }

  // Hard fallback
  const defaults: Record<string, number> = {
    SERVICE: 90, BRAKES: 75, DIAGNOSTICS: 45, TYRES: 30, INSPECTION: 60, REPAIR: 120, OTHER: 60,
  };
  return {
    minutes: defaults[service_type] || 60,
    basis: "STANDARD",
    confidence: 50,
    p80: (defaults[service_type] || 60) + 30,
  };
}

// Compute smart buffer
function computeSmartBuffer(
  service_type: string,
  vehicle_year: number | undefined,
  is_first_visit: boolean,
  customer_had_additional_work_before: boolean
): number {
  let buffer = 0;
  const currentYear = new Date().getFullYear();
  if (vehicle_year && currentYear - vehicle_year > 10) buffer += 15; // Old vehicle
  if (is_first_visit) buffer += 20; // Unknown history
  if (service_type === "DIAGNOSTICS") buffer += 30; // Unknown scope
  if (customer_had_additional_work_before) buffer += 20; // Tends to need extra
  return buffer;
}

// Compute delay risk
async function computeDelayRisk(
  service_type: string,
  vehicle_make: string | undefined,
  technician_id: string,
  date: string,
  load_pct: number
): Promise<{ risk_pct: number; reason: string }> {
  let risk = 5; // base
  const reasons: string[] = [];

  // Day-of-week behavioral patterns
  const dayOfWeek = new Date(date).getDay();
  if (dayOfWeek === 1) { risk += 5; reasons.push("Måndag morgon"); } // Monday
  if (dayOfWeek === 5) { risk += 5; reasons.push("Fredag eftermiddag"); } // Friday

  // Load-based risk
  if (load_pct > 85) { risk += 10; reasons.push("Hög beläggning"); }
  else if (load_pct > 70) { risk += 5; reasons.push("Medelhög beläggning"); }

  // Service type risk
  if (service_type === "DIAGNOSTICS") { risk += 5; reasons.push("Okänt omfång"); }
  if (service_type === "REPAIR") { risk += 8; reasons.push("Komplex reparation"); }

  return {
    risk_pct: Math.min(risk, 95),
    reason: reasons.length > 0 ? reasons.join(", ") : "Normal risk",
  };
}

// Get technician capacity for a date
async function getTechCapacity(technician_id: string, date: string, org_id: string) {
  const { data } = await supabase
    .from("booking_capacity")
    .select("*")
    .eq("technician_id", technician_id)
    .eq("date", date)
    .single();

  if (data) {
    if (data.is_vacation || data.is_sick || data.is_training) {
      return null; // Not available
    }
    const total = data.total_minutes;
    const available = total - data.booked_minutes - data.buffer_minutes;
    const load_pct = Math.round((data.booked_minutes / total) * 100);
    return { available_minutes: available, total_minutes: total, booked_minutes: data.booked_minutes, load_pct };
  }

  // No capacity record = full day available (default hours 08:00-17:00 = 540 min)
  return { available_minutes: 540 - 30, total_minutes: 540, booked_minutes: 0, load_pct: 0 };
}

// Compute allocated start time based on current bookings
async function computeStartTime(technician_id: string, date: string, org_id: string): Promise<string> {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("allocated_end")
    .eq("allocated_technician_id", technician_id)
    .eq("allocated_date", date)
    .in("status", ["PENDING", "CONFIRMED", "IN_PROGRESS"])
    .order("allocated_end", { ascending: false })
    .limit(1);

  if (bookings && bookings.length > 0 && bookings[0].allocated_end) {
    return bookings[0].allocated_end;
  }
  return "08:00"; // Start of day
}

// Add minutes to HH:MM time
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

// Check if time fits within working hours
function fitsInDay(start_time: string, duration_minutes: number, work_end: string = "17:00"): boolean {
  const [sh, sm] = start_time.split(":").map(Number);
  const [eh, em] = work_end.split(":").map(Number);
  const start_total = sh * 60 + sm;
  const end_total = eh * 60 + em;
  return start_total + duration_minutes <= end_total;
}

// Format date as Swedish readable
function formatSwedishDate(dateStr: string): string {
  const days = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
  const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
  const d = new Date(dateStr);
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

// Format short date (Ons 25 mars)
function formatShortSwedishDate(dateStr: string): string {
  const days = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"];
  const months = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];
  const d = new Date(dateStr);
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

// Generate candidate dates based on preference
function getCandidateDates(preference: string, preferred_date?: string): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preference === "ASAP") {
    for (let i = 1; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d.toISOString().split("T")[0]);
      if (dates.length >= 5) break;
    }
  } else if (preference === "THIS_WEEK") {
    const daysUntilFriday = 5 - today.getDay();
    for (let i = 1; i <= Math.max(daysUntilFriday, 5); i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d.toISOString().split("T")[0]);
      if (dates.length >= 5) break;
    }
  } else if (preference === "SPECIFIC_DATE" && preferred_date) {
    // Try preferred date + 2 days around it
    const base = new Date(preferred_date);
    for (let i = 0; i <= 4; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d.toISOString().split("T")[0]);
      if (dates.length >= 5) break;
    }
  } else {
    // NO_PREFERENCE: next 7 working days
    for (let i = 1; i <= 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d.toISOString().split("T")[0]);
      if (dates.length >= 7) break;
    }
  }

  return dates;
}

// Core allocation function
async function allocate(intent: Intent): Promise<AllocationCandidate[]> {
  const requiredSkills = SERVICE_SKILLS[intent.service_type] || [];
  const candidateDates = getCandidateDates(intent.preference, intent.preferred_date);

  const estimate = await getTimeEstimate(intent.service_type, intent.vehicle_make, intent.org_id);
  const smartBuffer = computeSmartBuffer(
    intent.service_type,
    intent.vehicle_year,
    true, // assume first visit for now (no DB history check)
    false
  );
  const totalMinutes = estimate.minutes + smartBuffer;

  // Filter technicians by skills
  const eligibleTechs = DEMO_TECHNICIANS.filter((t) =>
    requiredSkills.length === 0 || requiredSkills.every((s) => t.skills.includes(s))
  );

  const candidates: AllocationCandidate[] = [];

  for (const date of candidateDates) {
    for (const tech of eligibleTechs) {
      const capacity = await getTechCapacity(tech.id, date, intent.org_id);
      if (!capacity) continue;
      if (capacity.available_minutes < totalMinutes) continue;

      const startTime = await computeStartTime(tech.id, date, intent.org_id);
      if (!fitsInDay(startTime, totalMinutes)) continue;

      const endTime = addMinutes(startTime, totalMinutes);
      const delayRisk = await computeDelayRisk(
        intent.service_type,
        intent.vehicle_make,
        tech.id,
        date,
        capacity.load_pct
      );

      // Scoring
      let score = 100;

      // Load balance: prefer 60-80% load (not too free, not overwhelmed)
      const load = capacity.load_pct;
      if (load >= 60 && load <= 80) score += 20;
      else if (load < 60) score += 10; // Slightly prefer busier techs (efficiency)
      else if (load > 80) score -= 20;

      // Skill match: prefer specialist for make
      const isSpecialist = intent.vehicle_make && tech.specialty_makes.includes(intent.vehicle_make);
      if (isSpecialist) score += 30;

      // Delay risk: lower is better
      score -= delayRisk.risk_pct;

      // Prefer earlier dates
      const dateScore = candidateDates.indexOf(date);
      score -= dateScore * 5;

      let reason = "";
      if (isSpecialist) reason = `Specialist på ${intent.vehicle_make}`;
      else if (load < 30) reason = "Tidig start, snabb leverans";
      else if (delayRisk.risk_pct < 10) reason = "Bäst kapacitet, låg risk";
      else reason = `${tech.name.split(" ")[0]} är tillgänglig`;

      candidates.push({
        technician_id: tech.id,
        technician_name: tech.name,
        date,
        start_time: startTime,
        end_time: endTime,
        estimated_minutes: totalMinutes,
        smart_buffer_added: smartBuffer,
        delay_risk_pct: delayRisk.risk_pct,
        delay_risk_reason: delayRisk.reason,
        load_pct: capacity.load_pct,
        score,
        reason,
        estimate_basis: estimate.basis,
        estimate_confidence: estimate.confidence,
      });
    }

    // Stop after we have enough candidates (3+ across dates)
    if (candidates.length >= 9) break;
  }

  // Sort by score descending, return top 3 unique (one per date preferred)
  candidates.sort((a, b) => b.score - a.score);

  // Deduplicate: prefer one per date
  const seen = new Set<string>();
  const top: AllocationCandidate[] = [];
  for (const c of candidates) {
    if (!seen.has(c.date) && top.length < 3) {
      seen.add(c.date);
      top.push(c);
    }
  }

  // Fill up to 3 if needed
  for (const c of candidates) {
    if (top.length >= 3) break;
    if (!top.includes(c)) top.push(c);
  }

  return top.slice(0, 3);
}

// Generate booking confirmation number
function generateConfirmationNumber(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `BK-${year}-${num}`;
}

// ============================================================
// ENDPOINTS
// ============================================================

// GET /api/booking/availability
router.get("/api/booking/availability", async (req: Request, res: Response) => {
  try {
    const {
      service_type = "SERVICE",
      vehicle_make,
      vehicle_year,
      date_preference = "ASAP",
      org_id = DEMO_ORG_ID,
    } = req.query as Record<string, string>;

    const intent: Intent = {
      service_type,
      vehicle_make,
      vehicle_year: vehicle_year ? parseInt(vehicle_year) : undefined,
      preference: (date_preference as any) || "ASAP",
      org_id,
    };

    const estimate = await getTimeEstimate(service_type, vehicle_make, org_id);
    const candidates = await allocate(intent);
    const delayRiskFactors: string[] = [];

    if (candidates.length === 0) {
      return res.json({
        recommended: [],
        alternatives: [],
        next_available: null,
        estimated_minutes: estimate.minutes,
        estimate_basis: estimate.basis,
        delay_risk_factors: ["Ingen tillgänglig kapacitet"],
        warning: "Inga lediga tider hittades. Kontakta oss direkt.",
      });
    }

    const recommended = candidates.slice(0, 1).map((c) => ({
      date: c.date,
      date_label: formatShortSwedishDate(c.date),
      start: c.start_time,
      end: c.end_time,
      technician: c.technician_name,
      technician_id: c.technician_id,
      confidence: c.estimate_confidence,
      delay_risk_pct: c.delay_risk_pct,
      reason: c.reason,
      estimated_minutes: c.estimated_minutes,
      smart_buffer_added: c.smart_buffer_added,
    }));

    const alternatives = candidates.slice(1).map((c) => ({
      date: c.date,
      date_label: formatShortSwedishDate(c.date),
      start: c.start_time,
      end: c.end_time,
      technician: c.technician_name,
      technician_id: c.technician_id,
      confidence: c.estimate_confidence,
      delay_risk_pct: c.delay_risk_pct,
      reason: c.reason,
      estimated_minutes: c.estimated_minutes,
    }));

    res.json({
      recommended,
      alternatives,
      next_available: candidates[0]?.date || null,
      estimated_minutes: estimate.minutes,
      estimate_basis: estimate.basis,
      delay_risk_factors: delayRiskFactors,
    });
  } catch (err: any) {
    console.error("[BookingEngine] availability error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/booking/suggest
router.post("/api/booking/suggest", async (req: Request, res: Response) => {
  try {
    const {
      service_type = "SERVICE",
      vehicle_reg,
      vehicle_make,
      vehicle_year,
      preference = "ASAP",
      date,
      org_id = DEMO_ORG_ID,
    } = req.body;

    const intent: Intent = {
      service_type,
      vehicle_make,
      vehicle_year,
      vehicle_reg,
      preference,
      preferred_date: date,
      org_id,
    };

    const candidates = await allocate(intent);

    if (candidates.length === 0) {
      return res.json({
        suggestions: [],
        warning: "Ingen tillgänglig tid hittades. Prova en annan period eller kontakta oss direkt.",
      });
    }

    // Compute overall load warning
    const avgLoad = candidates.reduce((s, c) => s + c.load_pct, 0) / candidates.length;
    const warning = avgLoad > 70
      ? "Hög belastning denna vecka — vi rekommenderar att boka tidigt"
      : undefined;

    const suggestions = candidates.map((c, i) => ({
      rank: i + 1,
      date: formatShortSwedishDate(c.date),
      date_raw: c.date,
      time: c.start_time,
      time_end: c.end_time,
      technician: c.technician_name.split(" ")[0], // First name only for UI
      technician_full: c.technician_name,
      technician_id: c.technician_id,
      estimated_minutes: c.estimated_minutes,
      smart_buffer_added: c.smart_buffer_added,
      delay_risk_pct: c.delay_risk_pct,
      reason: c.reason,
      estimate_basis: c.estimate_basis,
      estimate_confidence: c.estimate_confidence,
    }));

    res.json({ suggestions, warning });
  } catch (err: any) {
    console.error("[BookingEngine] suggest error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/booking/bookings — Create a booking
router.post("/api/booking/bookings", async (req: Request, res: Response) => {
  try {
    const {
      service_type,
      vehicle_reg,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      customer_phone,
      customer_name,
      customer_email,
      preference = "ASAP",
      selected_slot, // Optional: { date, technician_id, start_time, end_time }
      org_id = DEMO_ORG_ID,
    } = req.body;

    if (!service_type || !customer_phone) {
      return res.status(400).json({ error: "service_type och customer_phone krävs" });
    }

    const intent: Intent = {
      service_type,
      vehicle_make,
      vehicle_year,
      vehicle_reg,
      preference,
      preferred_date: selected_slot?.date,
      customer_phone,
      org_id,
    };

    // If customer selected a specific slot, use it; otherwise allocate
    let chosenSlot: AllocationCandidate | null = null;

    if (selected_slot?.date && selected_slot?.technician_id) {
      // Validate the selected slot is still available
      const candidates = await allocate(intent);
      chosenSlot = candidates.find(
        (c) => c.date === selected_slot.date && c.technician_id === selected_slot.technician_id
      ) || candidates[0] || null;
    } else {
      const candidates = await allocate(intent);
      chosenSlot = candidates[0] || null;
    }

    if (!chosenSlot) {
      return res.status(409).json({ error: "Ingen tillgänglig tid hittades. Prova ett annat datum." });
    }

    const confirmationNumber = generateConfirmationNumber();
    const requiredSkills = SERVICE_SKILLS[service_type] || [];

    // Insert booking
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        org_id,
        service_type,
        vehicle_reg,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        customer_name,
        customer_phone,
        customer_email,
        customer_preference: preference,
        preferred_date: selected_slot?.date || null,
        allocated_technician_id: chosenSlot.technician_id,
        allocated_technician_name: chosenSlot.technician_name,
        allocated_date: chosenSlot.date,
        allocated_start: chosenSlot.start_time,
        allocated_end: chosenSlot.end_time,
        estimated_minutes: chosenSlot.estimated_minutes,
        estimate_basis: chosenSlot.estimate_basis,
        estimate_confidence: chosenSlot.estimate_confidence,
        delay_risk_pct: chosenSlot.delay_risk_pct,
        delay_risk_reason: chosenSlot.delay_risk_reason,
        required_skills: requiredSkills,
        smart_buffer_added: chosenSlot.smart_buffer_added,
        status: "CONFIRMED",
        confirmed_at: new Date().toISOString(),
        pix_events: JSON.stringify([{
          type: "booking_created",
          timestamp: new Date().toISOString(),
          data: { confirmation_number: confirmationNumber, preference, allocated_date: chosenSlot.date },
        }]),
      })
      .select()
      .single();

    if (error) {
      console.error("[BookingEngine] insert error:", error);
      return res.status(500).json({ error: "Kunde inte skapa bokning" });
    }

    // Update capacity: increment booked_minutes
    await supabase.rpc("increment_booked_minutes", {
      p_technician_id: chosenSlot.technician_id,
      p_date: chosenSlot.date,
      p_minutes: chosenSlot.estimated_minutes,
      p_org_id: org_id,
    }).then(() => { return; });
    // eslint-disable-next-line @typescript-eslint/no-empty-function

    // Send confirmation SMS
    let smsSent = false;
    const dateLabel = formatSwedishDate(chosenSlot.date);
    const smsText = `Bokning bekräftad! ${dateLabel} kl ${chosenSlot.start_time} hos ${chosenSlot.technician_name.split(" ")[0]}. Lämna bilen 10 min tidigt. Ref: ${confirmationNumber}`;
    try {
      smsSent = await sendGenericSMS(customer_phone, smsText);
      if (smsSent) {
        await supabase.from("bookings").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", booking.id);
      }
    } catch (smsErr) {
      console.warn("[BookingEngine] SMS failed:", smsErr);
    }

    res.status(201).json({
      booking_id: booking.id,
      confirmation_number: confirmationNumber,
      allocated_slot: {
        date: chosenSlot.date,
        date_label: formatShortSwedishDate(chosenSlot.date),
        start: chosenSlot.start_time,
        end: chosenSlot.end_time,
        technician: chosenSlot.technician_name,
        drop_off_at: addMinutes(chosenSlot.start_time, -10), // 10 min early
        estimated_minutes: chosenSlot.estimated_minutes,
        delay_risk_pct: chosenSlot.delay_risk_pct,
      },
      sms_sent: smsSent,
    });
  } catch (err: any) {
    console.error("[BookingEngine] create booking error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/booking/bookings/:id — Reschedule
router.patch("/api/booking/bookings/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { new_date, reason, notify_customer = true } = req.body;

    const { data: existing, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: "Bokning hittades inte" });
    }

    // Find next best slot
    const intent: Intent = {
      service_type: existing.service_type,
      vehicle_make: existing.vehicle_make,
      vehicle_year: existing.vehicle_year,
      preference: new_date ? "SPECIFIC_DATE" : "ASAP",
      preferred_date: new_date,
      org_id: existing.org_id,
    };

    const candidates = await allocate(intent);
    const newSlot = candidates[0];

    if (!newSlot) {
      return res.status(409).json({ error: "Ingen tillgänglig tid hittades för ombokning" });
    }

    const pixEvents = (existing.pix_events as any[] || []).concat([{
      type: "booking_rescheduled",
      timestamp: new Date().toISOString(),
      data: {
        from_date: existing.allocated_date,
        to_date: newSlot.date,
        reason: reason || "Kund begärd ombokning",
      },
    }]);

    await supabase.from("bookings").update({
      allocated_technician_id: newSlot.technician_id,
      allocated_technician_name: newSlot.technician_name,
      allocated_date: newSlot.date,
      allocated_start: newSlot.start_time,
      allocated_end: newSlot.end_time,
      estimated_minutes: newSlot.estimated_minutes,
      delay_risk_pct: newSlot.delay_risk_pct,
      delay_risk_reason: newSlot.delay_risk_reason,
      status: "RESCHEDULED",
      pix_events: JSON.stringify(pixEvents),
    }).eq("id", id);

    // SMS notification
    let smsSent = false;
    if (notify_customer && existing.customer_phone) {
      const dateLabel = formatSwedishDate(newSlot.date);
      const smsText = `Din bokning är ombokt till ${dateLabel} kl ${newSlot.start_time}. Tekniker: ${newSlot.technician_name.split(" ")[0]}. Frågor? Ring oss.`;
      smsSent = await sendGenericSMS(existing.customer_phone, smsText).catch(() => false);
    }

    res.json({
      booking_id: id,
      new_slot: {
        date: newSlot.date,
        date_label: formatShortSwedishDate(newSlot.date),
        start: newSlot.start_time,
        end: newSlot.end_time,
        technician: newSlot.technician_name,
        delay_risk_pct: newSlot.delay_risk_pct,
      },
      sms_sent: smsSent,
    });
  } catch (err: any) {
    console.error("[BookingEngine] reschedule error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/booking/bookings/:id — Cancel
router.delete("/api/booking/bookings/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, notify_customer = true } = req.body;

    const { data: existing, error: fetchErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: "Bokning hittades inte" });
    }

    const pixEvents = (existing.pix_events as any[] || []).concat([{
      type: "booking_cancelled",
      timestamp: new Date().toISOString(),
      data: { reason: reason || "Avbokad", by: "system" },
    }]);

    await supabase.from("bookings").update({
      status: "CANCELLED",
      pix_events: JSON.stringify(pixEvents),
    }).eq("id", id);

    let smsSent = false;
    if (notify_customer && existing.customer_phone) {
      const smsText = `Din bokning (${existing.service_type}) är avbokad. Kontakta oss för ny tid.`;
      smsSent = await sendGenericSMS(existing.customer_phone, smsText).catch(() => false);
    }

    res.json({ cancelled: true, booking_id: id, sms_sent: smsSent });
  } catch (err: any) {
    console.error("[BookingEngine] cancel error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/booking/bookings — List bookings
router.get("/api/booking/bookings", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const org_id = user?.user_metadata?.org_id || user?.org_id || DEMO_ORG_ID;
    const { date, status, technician_id } = req.query as Record<string, string>;

    let query = supabase
      .from("bookings")
      .select("*")
      .eq("org_id", org_id)
      .order("allocated_date", { ascending: true })
      .order("allocated_start", { ascending: true });

    if (date) query = query.eq("allocated_date", date);
    if (status) query = query.eq("status", status);
    if (technician_id) query = query.eq("allocated_technician_id", technician_id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Group by date
    const grouped: Record<string, any[]> = {};
    for (const b of (data || [])) {
      const key = b.allocated_date || "unscheduled";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(b);
    }

    res.json({ bookings: data, grouped });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/booking/capacity — Capacity overview for date range
router.get("/api/booking/capacity", async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const org_id = user?.user_metadata?.org_id || user?.org_id || DEMO_ORG_ID;
    const { start_date, end_date } = req.query as Record<string, string>;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: "start_date och end_date krävs" });
    }

    const { data: capacityRows } = await supabase
      .from("booking_capacity")
      .select("*")
      .eq("org_id", org_id)
      .gte("date", start_date)
      .lte("date", end_date);

    const { data: bookingsInRange } = await supabase
      .from("bookings")
      .select("allocated_date, allocated_technician_id, estimated_minutes, status")
      .eq("org_id", org_id)
      .gte("allocated_date", start_date)
      .lte("allocated_date", end_date)
      .in("status", ["PENDING", "CONFIRMED", "IN_PROGRESS"]);

    // Build per-day summary
    const dayMap: Record<string, { booked: number; total: number; count: number }> = {};
    for (const b of (bookingsInRange || [])) {
      if (!b.allocated_date) continue;
      if (!dayMap[b.allocated_date]) dayMap[b.allocated_date] = { booked: 0, total: 540 * DEMO_TECHNICIANS.length, count: 0 };
      dayMap[b.allocated_date].booked += b.estimated_minutes || 0;
      dayMap[b.allocated_date].count += 1;
    }

    const overview = Object.entries(dayMap).map(([date, d]) => ({
      date,
      date_label: formatShortSwedishDate(date),
      booked_minutes: d.booked,
      total_minutes: d.total,
      load_pct: Math.round((d.booked / d.total) * 100),
      booking_count: d.count,
      delay_risk: d.booked / d.total > 0.85 ? "HIGH" : d.booked / d.total > 0.65 ? "MEDIUM" : "LOW",
    })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({ overview, capacity_rows: capacityRows || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/booking/no-show/:id — Mark as no-show
router.post("/api/booking/no-show/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (!existing) return res.status(404).json({ error: "Bokning hittades inte" });

    const pixEvents = (existing.pix_events as any[] || []).concat([{
      type: "booking_no_show",
      timestamp: new Date().toISOString(),
      data: { customer_phone: existing.customer_phone },
    }]);

    await supabase.from("bookings").update({
      status: "NO_SHOW",
      pix_events: JSON.stringify(pixEvents),
    }).eq("id", id);

    // Count no-shows for this customer
    const { count } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("customer_phone", existing.customer_phone)
      .eq("status", "NO_SHOW");

    const isHighRisk = (count || 0) >= 2;

    res.json({
      marked_no_show: true,
      booking_id: id,
      customer_no_show_count: count || 1,
      is_high_risk_customer: isHighRisk,
      recommendation: isHighRisk
        ? "Kunden har 2+ uteblivanden. Håll platsen tills bekräftelse 2h innan."
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
