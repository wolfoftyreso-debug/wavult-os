import { CalibrationProviderConnector, RawCertificate } from "./index";

export class TrescalConnector implements CalibrationProviderConnector {
  providerId = "TRESCAL";
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { baseUrl?: string; apiKey: string }) {
    this.baseUrl = config.baseUrl || "https://myportal.trescal.com/api/v1";
    this.apiKey = config.apiKey;
  }

  async authenticate(): Promise<boolean> {
    // Trescal uses API key authentication — validate by calling /account
    try {
      const res = await fetch(`${this.baseUrl}/account`, { headers: this.headers });
      return res.ok;
    } catch {
      return false;
    }
  }

  private get headers() {
    return {
      'Authorization': `ApiKey ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async fetchCertificates(since?: Date): Promise<RawCertificate[]> {
    const params = since ? `?updated_after=${since.toISOString()}` : '';
    const res = await fetch(`${this.baseUrl}/certificates${params}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Trescal fetchCertificates failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.certificates || data.items || []).map(this.mapToRawCertificate);
  }

  async fetchCertificateById(certNumber: string): Promise<RawCertificate> {
    // Trescal uses cert_ref as the primary identifier
    const res = await fetch(`${this.baseUrl}/certificates/${encodeURIComponent(certNumber)}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Trescal fetchCertificateById failed: ${res.status}`);
    return this.mapToRawCertificate(await res.json());
  }

  async fetchCertificatePDF(certNumber: string): Promise<Buffer> {
    const res = await fetch(`${this.baseUrl}/certificates/${encodeURIComponent(certNumber)}/pdf`, { headers: this.headers });
    if (!res.ok) throw new Error(`Trescal PDF fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async searchBySerialNumber(serial: string): Promise<RawCertificate[]> {
    // Trescal uses instrument_id to identify instruments
    const res = await fetch(`${this.baseUrl}/certificates?instrument_id=${encodeURIComponent(serial)}`, { headers: this.headers });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.certificates || data.items || []).map(this.mapToRawCertificate);
  }

  async searchByCustomerReference(ref: string): Promise<RawCertificate[]> {
    const res = await fetch(`${this.baseUrl}/certificates?customer_ref=${encodeURIComponent(ref)}`, { headers: this.headers });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.certificates || data.items || []).map(this.mapToRawCertificate);
  }

  async getCalibrationStatus(serial: string): Promise<{ status: string; nextDue: Date; lastCert: string }> {
    // Trescal uses calibration_due field for next due date
    const certs = await this.searchBySerialNumber(serial);
    if (!certs.length) throw new Error(`No calibration found for instrument_id: ${serial}`);
    const latest = certs[0];
    // calibration_due is a Trescal-specific field mapped to nextCalibrationDate
    const nextDue = latest.nextCalibrationDate ? new Date(latest.nextCalibrationDate) : new Date();
    return {
      status: latest.overallResult,
      nextDue,
      lastCert: latest.certificateNumber,
    };
  }

  async registerWebhook(callbackUrl: string, events: string[]): Promise<void> {
    await fetch(`${this.baseUrl}/webhooks`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ webhook_url: callbackUrl, event_types: events }),
    });
  }

  private mapToRawCertificate(raw: any): RawCertificate {
    // Trescal-specific field names:
    // cert_ref          -> certificateNumber
    // instrument_id     -> instrumentSerial
    // calibration_due   -> nextCalibrationDate
    return {
      certificateNumber: raw.cert_ref || raw.certificate_number || raw.id,
      calibrationDate: raw.calibration_date || raw.performed_date,
      // calibration_due is the Trescal-specific field for next due date
      nextCalibrationDate: raw.calibration_due || raw.next_calibration_date,
      // instrument_id is Trescal's identifier for the instrument
      instrumentSerial: raw.instrument_id || raw.instrument?.serial_number || '',
      instrumentDescription: raw.instrument_description || raw.instrument?.name || '',
      instrumentManufacturer: raw.instrument_manufacturer || raw.instrument?.manufacturer,
      instrumentModel: raw.instrument_model || raw.instrument?.model,
      overallResult: raw.result === 'PASS' ? 'PASS'
        : raw.result === 'ADJUSTED' ? 'ADJUSTED_PASS'
        : 'FAIL',
      results: (raw.measurement_results || raw.results || []).map((r: any) => ({
        parameter: r.parameter,
        nominalValue: r.nominal_value ?? r.nominal,
        measuredValue: r.measured_value ?? r.measured,
        unit: r.unit,
        toleranceLow: r.tolerance_low,
        toleranceHigh: r.tolerance_high,
        uncertainty: r.uncertainty,
        pass: r.pass,
      })),
      referenceStandards: (raw.reference_standards || raw.standards || []).map((s: any) => ({
        standard: s.standard || s.standard_id,
        traceableTo: s.traceable_to || s.traceability,
      })),
      environmentalConditions: raw.environmental_conditions ? {
        temperature: raw.environmental_conditions.temperature,
        humidity: raw.environmental_conditions.humidity,
        pressure: raw.environmental_conditions.pressure,
      } : undefined,
      pdfUrl: raw.pdf_url || raw.report_url,
      rawData: raw,
    };
  }
}
