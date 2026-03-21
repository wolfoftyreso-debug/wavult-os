// ---------------------------------------------------------------------------
// Checklist Engine — Hypbit Workshop Hard Enforcement
// ---------------------------------------------------------------------------
// Konfigurerbara checklistor per state-transition.
// Stödjer: required=true, required='if_applicable', required='if_warranty'
// ---------------------------------------------------------------------------

import { Router, Request, Response } from "express";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChecklistType = "QC" | "DELIVERY";
export type RequiredMode = true | false | "if_applicable" | "if_warranty";

export interface ChecklistItemTemplate {
  id: string;
  category?: string;
  item: string;
  required: RequiredMode;
}

export interface ChecklistItemRecord {
  id: string;
  work_order_id: string;
  checklist_type: ChecklistType;
  item_id: string;
  category?: string;
  item: string;
  required: RequiredMode;
  completed: boolean;
  completed_by?: string;
  completed_at?: string;
  notes?: string;
}

export interface ChecklistStatus {
  work_order_id: string;
  checklist_type: ChecklistType;
  total: number;
  required_total: number;
  completed: number;
  required_completed: number;
  percent_total: number;
  percent_required: number;
  is_complete: boolean;
  items: ChecklistItemRecord[];
}

// ---------------------------------------------------------------------------
// Standard checklist templates
// ---------------------------------------------------------------------------

export const STANDARD_QC_CHECKLIST: ChecklistItemTemplate[] = [
  {
    id: "qc_1",
    category: "Säkerhet",
    item: "Bromsar kontrollerade",
    required: true,
  },
  {
    id: "qc_2",
    category: "Säkerhet",
    item: "Däcktryck kontrollerat",
    required: true,
  },
  {
    id: "qc_3",
    category: "Säkerhet",
    item: "Belysning kontrollerad",
    required: true,
  },
  {
    id: "qc_4",
    category: "Utfört arbete",
    item: "Beställt arbete utfört",
    required: true,
  },
  {
    id: "qc_5",
    category: "Utfört arbete",
    item: "Tilläggsarbete utfört",
    required: "if_applicable",
  },
  {
    id: "qc_6",
    category: "Renlighet",
    item: "Fordon rengjort invändigt",
    required: true,
  },
  {
    id: "qc_7",
    category: "Renlighet",
    item: "Fordon rengjort utvändigt",
    required: true,
  },
  {
    id: "qc_8",
    category: "Dokumentation",
    item: "Alla delar dokumenterade",
    required: true,
  },
  {
    id: "qc_9",
    category: "Dokumentation",
    item: "Garantiärende skapat om relevant",
    required: "if_applicable",
  },
];

export const DELIVERY_CHECKLIST: ChecklistItemTemplate[] = [
  { id: "del_1", item: "Nyckel returnerad", required: true },
  {
    id: "del_2",
    item: "Servicepapper genomgångna med kund",
    required: true,
  },
  {
    id: "del_3",
    item: "Garantiinformation given",
    required: "if_warranty",
  },
  { id: "del_4", item: "Nästa service påminnelse satt", required: true },
  { id: "del_5", item: "Kund nöjd (signerat)", required: true },
];

export const CHECKLIST_TEMPLATES: Record<
  ChecklistType,
  ChecklistItemTemplate[]
> = {
  QC: STANDARD_QC_CHECKLIST,
  DELIVERY: DELIVERY_CHECKLIST,
};

// ---------------------------------------------------------------------------
// ChecklistEngine
// ---------------------------------------------------------------------------

export class ChecklistEngine {
  // -----------------------------------------------------------------------
  // getTemplate — returns the template for a checklist type
  // -----------------------------------------------------------------------
  getTemplate(type: ChecklistType): ChecklistItemTemplate[] {
    return CHECKLIST_TEMPLATES[type] ?? [];
  }

  // -----------------------------------------------------------------------
  // initChecklist — create checklist items for a work order if not exist
  // -----------------------------------------------------------------------
  async initChecklist(
    workOrderId: string,
    type: ChecklistType,
    orgId: string
  ): Promise<void> {
    // Check if already initialized
    const { data: existing } = await supabase
      .from("checklist_items")
      .select("id")
      .eq("work_order_id", workOrderId)
      .eq("checklist_type", type)
      .limit(1);

    if (existing && existing.length > 0) return; // Already initialized

    const template = this.getTemplate(type);
    const rows = template.map((t) => ({
      work_order_id: workOrderId,
      org_id: orgId,
      checklist_type: type,
      item_id: t.id,
      category: t.category ?? null,
      item: t.item,
      required: t.required,
      completed: false,
      created_at: new Date().toISOString(),
    }));

    await supabase.from("checklist_items").insert(rows);
  }

  // -----------------------------------------------------------------------
  // getChecklist — fetch all items for a work order + type
  // -----------------------------------------------------------------------
  async getChecklist(
    workOrderId: string,
    type: ChecklistType
  ): Promise<ChecklistItemRecord[]> {
    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("work_order_id", workOrderId)
      .eq("checklist_type", type)
      .order("item_id", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as ChecklistItemRecord[];
  }

  // -----------------------------------------------------------------------
  // checkItem — mark a single checklist item as completed/uncompleted
  // -----------------------------------------------------------------------
  async checkItem(
    workOrderId: string,
    type: ChecklistType,
    itemId: string,
    userId: string,
    completed: boolean,
    notes?: string
  ): Promise<ChecklistItemRecord> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("checklist_items")
      .update({
        completed,
        completed_by: completed ? userId : null,
        completed_at: completed ? now : null,
        notes: notes ?? null,
        updated_at: now,
      })
      .eq("work_order_id", workOrderId)
      .eq("checklist_type", type)
      .eq("item_id", itemId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as ChecklistItemRecord;
  }

  // -----------------------------------------------------------------------
  // getStatus — compute completion stats
  // -----------------------------------------------------------------------
  async getStatus(
    workOrderId: string,
    type: ChecklistType
  ): Promise<ChecklistStatus> {
    const items = await this.getChecklist(workOrderId, type);

    const required = items.filter((i) => i.required === true);
    const requiredCompleted = required.filter((i) => i.completed);
    const totalCompleted = items.filter((i) => i.completed);

    const isComplete =
      required.length > 0
        ? requiredCompleted.length === required.length
        : totalCompleted.length === items.length;

    return {
      work_order_id: workOrderId,
      checklist_type: type,
      total: items.length,
      required_total: required.length,
      completed: totalCompleted.length,
      required_completed: requiredCompleted.length,
      percent_total:
        items.length > 0
          ? Math.round((totalCompleted.length / items.length) * 100)
          : 0,
      percent_required:
        required.length > 0
          ? Math.round((requiredCompleted.length / required.length) * 100)
          : 100,
      is_complete: isComplete,
      items,
    };
  }

  // -----------------------------------------------------------------------
  // getGrouped — items grouped by category
  // -----------------------------------------------------------------------
  async getGrouped(
    workOrderId: string,
    type: ChecklistType
  ): Promise<Record<string, ChecklistItemRecord[]>> {
    const items = await this.getChecklist(workOrderId, type);
    const grouped: Record<string, ChecklistItemRecord[]> = {};

    for (const item of items) {
      const cat = item.category ?? "Övrigt";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    return grouped;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const checklistEngine = new ChecklistEngine();

// ---------------------------------------------------------------------------
// Express Router
// ---------------------------------------------------------------------------

const router = Router();

const auth = (req: Request, res: Response, next: Function) => {
  if (!(req as any).user)
    return res.status(401).json({ error: "Ej autentiserad" });
  next();
};

// ---------------------------------------------------------------------------
// GET /api/checklists/:type — get template definition
// ---------------------------------------------------------------------------
router.get(
  "/api/checklists/:type",
  auth,
  (req: Request, res: Response) => {
    const type = req.params.type.toUpperCase() as ChecklistType;
    if (!["QC", "DELIVERY"].includes(type)) {
      return res
        .status(400)
        .json({ error: "Okänd checkliste-typ. Använd: QC, DELIVERY" });
    }
    const template = checklistEngine.getTemplate(type);
    return res.json({ type, items: template });
  }
);

// ---------------------------------------------------------------------------
// POST /api/checklists/:work_order_id/:type/init — initialize checklist
// ---------------------------------------------------------------------------
router.post(
  "/api/checklists/:work_order_id/:type/init",
  auth,
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const type = req.params.type.toUpperCase() as ChecklistType;

    try {
      await checklistEngine.initChecklist(
        req.params.work_order_id,
        type,
        user.org_id
      );
      const status = await checklistEngine.getStatus(
        req.params.work_order_id,
        type
      );
      return res.json(status);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/checklists/:work_order_id/:type/item/:item_id — check off item
// ---------------------------------------------------------------------------
router.post(
  "/api/checklists/:work_order_id/:type/item/:item_id",
  auth,
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const type = req.params.type.toUpperCase() as ChecklistType;
    const { completed = true, notes } = req.body;

    try {
      const item = await checklistEngine.checkItem(
        req.params.work_order_id,
        type,
        req.params.item_id,
        user.id,
        Boolean(completed),
        notes
      );

      // Also return updated status
      const status = await checklistEngine.getStatus(
        req.params.work_order_id,
        type
      );

      return res.json({ item, status });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/checklists/:work_order_id/:type/status — completion stats
// ---------------------------------------------------------------------------
router.get(
  "/api/checklists/:work_order_id/:type/status",
  auth,
  async (req: Request, res: Response) => {
    const type = req.params.type.toUpperCase() as ChecklistType;

    try {
      const status = await checklistEngine.getStatus(
        req.params.work_order_id,
        type
      );
      return res.json(status);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/checklists/:work_order_id/:type — get all items (grouped)
// ---------------------------------------------------------------------------
router.get(
  "/api/checklists/:work_order_id/:type",
  auth,
  async (req: Request, res: Response) => {
    const type = req.params.type.toUpperCase() as ChecklistType;

    try {
      const grouped = await checklistEngine.getGrouped(
        req.params.work_order_id,
        type
      );
      const status = await checklistEngine.getStatus(
        req.params.work_order_id,
        type
      );
      return res.json({ grouped, status });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

export default router;
