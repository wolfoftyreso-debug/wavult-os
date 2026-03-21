import { CalibrationProviderConnector, RawCertificate } from "./index";

export class FlukeConnector implements CalibrationProviderConnector {
  providerId = "FLUKE";
  private baseUrl: string;
  private apiKey: string;
  private accessToken: string | null = null;

  constructor(config: { baseUrl?: string; apiKey: string }) {
    this.baseUrl = config.baseUrl || "https://api.flukecloud.com/v1";
    this.apiKey = config.apiKey;
  }

  async authenticate(): Promise<boolean> {
    // Fluke Connect Cloud uses API key token exchange
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
    const res = await fetch(`${this.baseUrl}/certificates${params}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Fluke fetchCertificates failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.certificates || []).map(this.mapToRawCertificate);
  }

  async fetchCertificateById(certNumber: string): Promise<RawCertificate> {
    const res = await fetch(`${this.baseUrl}/certificates/${certNumber}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Fluke fetchCertificateById failed: ${res.status}`);
    return this.mapToRawCertificate(await res.json());
  }

  async fetchCertificatePDF(certNumber: string): Promise<Buffer> {
    const res = await fetch(`${this.baseUrl}/certificates/${certNumber}/pdf`, { headers: this.headers });
    if (!res.ok) throw new Error(`Fluke PDF fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async searchBySerialNumber(serial: string): Promise<RawCertificate[]> {
    // Fluke uses asset_id to identify instruments
    const res = await fetch(`${this.baseUrl}/certificates?asset_id=${encodeURIComponent(serial)}`, { headers: this.headers });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.certificates || []).map(this.mapToRawCertificate);
  }

  async searchByCustomerReference(ref: string): Promise<RawCertificate[]> {
    const res = await fetch(`${this.baseUrl}/certificates?customer_ref=${encodeURIComponent(ref)}`, { headers: this.headers });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.certificates || []).map(this.mapToRawCertificate);
  }

  async getCalibrationStatus(serial: string): Promise<{ status: string; nextDue: Date; lastCert: string }> {
    const certs = await this.searchBySerialNumber(serial);
    if (!certs.length) throw new Error(`No calibration found for asset_id: ${serial}`);
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
      body: JSON.stringify({ callback_url: callbackUrl, events }),
    });
  }

  private mapToRawCertificate(raw: any): RawCertificate {
    return {
      // Fluke uses certificate_id or cert_number
      certificateNumber: raw.certificate_id || raw.cert_number || raw.id,
      // Fluke uses test_date instead of calibration_date
      calibrationDate: raw.test_date,
      nextCalibrationDate: raw.next_test_date,
      // Fluke uses asset_id instead of instrument.serial_number
      instrumentSerial: raw.asset_id || raw.asset?.serial_number || '',
      instrumentDescription: raw.asset?.description || raw.asset?.name || '',
      instrumentManufacturer: raw.asset?.manufacturer,
      instrumentModel: raw.asset?.model,
      overallResult: raw.overall_status === 'PASS' ? 'PASS'
        : raw.overall_status === 'ADJUSTED' ? 'ADJUSTED_PASS'
        : 'FAIL',
      results: (raw.test_results || []).map((r: any) => ({
        parameter: r.parameter_name || r.parameter,
        nominalValue: r.nominal_value ?? r.nominal,
        measuredValue: r.measured_value ?? r.measured,
        unit: r.unit,
        toleranceLow: r.tolerance_low ?? r.lower_limit,
        toleranceHigh: r.tolerance_high ?? r.upper_limit,
        uncertainty: r.measurement_uncertainty ?? r.uncertainty,
        pass: r.pass_fail === 'PASS' || r.pass === true,
      })),
      referenceStandards: (raw.reference_standards || []).map((s: any) => ({
        standard: s.standard_id || s.standard,
        traceableTo: s.traceable_to || s.traceability,
      })),
      environmentalConditions: raw.test_conditions ? {
        temperature: raw.test_conditions.temperature,
        humidity: raw.test_conditions.humidity,
        pressure: raw.test_conditions.pressure,
      } : undefined,
      pdfUrl: raw.report_url || raw.pdf_url,
      rawData: raw,
    };
  }
}
