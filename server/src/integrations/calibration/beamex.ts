import { CalibrationProviderConnector, RawCertificate } from "./index";

export class BeamexConnector implements CalibrationProviderConnector {
  providerId = "BEAMEX";
  private baseUrl: string;
  private apiKey: string;
  private accessToken: string | null = null;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl || "https://api.beamex.com/cmx/v1";
    this.apiKey = config.apiKey;
  }

  async authenticate(): Promise<boolean> {
    // Beamex CMX uses API key authentication
    // POST /auth/token with api_key
    try {
      const res = await fetch(`${this.baseUrl}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: this.apiKey }),
      });
      if (!res.ok) return false;
      const data = await res.json() as any;
      this.accessToken = data.access_token;
      return true;
    } catch {
      return false;
    }
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async fetchCertificates(since?: Date): Promise<RawCertificate[]> {
    const params = since ? `?modified_after=${since.toISOString()}` : '';
    const res = await fetch(`${this.baseUrl}/calibrations${params}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Beamex fetchCertificates failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.calibrations || []).map(this.mapToRawCertificate);
  }

  async fetchCertificateById(certNumber: string): Promise<RawCertificate> {
    const res = await fetch(`${this.baseUrl}/calibrations/${certNumber}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Beamex fetchCertificateById failed: ${res.status}`);
    return this.mapToRawCertificate(await res.json());
  }

  async fetchCertificatePDF(certNumber: string): Promise<Buffer> {
    const res = await fetch(`${this.baseUrl}/calibrations/${certNumber}/pdf`, { headers: this.headers });
    if (!res.ok) throw new Error(`Beamex PDF fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async searchBySerialNumber(serial: string): Promise<RawCertificate[]> {
    const res = await fetch(`${this.baseUrl}/calibrations?instrument_serial=${encodeURIComponent(serial)}`, { headers: this.headers });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.calibrations || []).map(this.mapToRawCertificate);
  }

  async searchByCustomerReference(ref: string): Promise<RawCertificate[]> {
    const res = await fetch(`${this.baseUrl}/calibrations?customer_ref=${encodeURIComponent(ref)}`, { headers: this.headers });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.calibrations || []).map(this.mapToRawCertificate);
  }

  async getCalibrationStatus(serial: string): Promise<{ status: string; nextDue: Date; lastCert: string }> {
    const certs = await this.searchBySerialNumber(serial);
    if (!certs.length) throw new Error(`No calibration found for serial: ${serial}`);
    const latest = certs[0];
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
      body: JSON.stringify({ url: callbackUrl, events }),
    });
  }

  private mapToRawCertificate(raw: any): RawCertificate {
    return {
      certificateNumber: raw.certificate_number || raw.id,
      calibrationDate: raw.calibration_date,
      nextCalibrationDate: raw.next_calibration_date,
      instrumentSerial: raw.instrument?.serial_number || '',
      instrumentDescription: raw.instrument?.description || '',
      instrumentManufacturer: raw.instrument?.manufacturer,
      instrumentModel: raw.instrument?.model,
      overallResult: raw.result === 'PASS' ? 'PASS' : raw.result === 'ADJUSTED' ? 'ADJUSTED_PASS' : 'FAIL',
      results: (raw.measurement_results || []).map((r: any) => ({
        parameter: r.parameter,
        nominalValue: r.nominal,
        measuredValue: r.measured,
        unit: r.unit,
        toleranceLow: r.tolerance_low,
        toleranceHigh: r.tolerance_high,
        uncertainty: r.uncertainty,
        pass: r.pass,
      })),
      referenceStandards: (raw.reference_standards || []).map((s: any) => ({
        standard: s.standard,
        traceableTo: s.traceable_to,
      })),
      environmentalConditions: raw.environment ? {
        temperature: raw.environment.temperature,
        humidity: raw.environment.humidity,
        pressure: raw.environment.pressure,
      } : undefined,
      pdfUrl: raw.pdf_url,
      rawData: raw,
    };
  }
}
