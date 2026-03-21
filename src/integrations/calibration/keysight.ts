import { CalibrationProviderConnector, RawCertificate } from "./index";

export class KeysightConnector implements CalibrationProviderConnector {
  providerId = "KEYSIGHT";
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: { baseUrl?: string; clientId: string; clientSecret: string }) {
    this.baseUrl = config.baseUrl || "https://api.keysight.com/pathwave/v1";
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  async authenticate(): Promise<boolean> {
    // Keysight PathWave Asset Advisor uses OAuth2 client_credentials flow
    try {
      const tokenUrl = "https://api.keysight.com/oauth2/token";
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'pathwave:calibration:read',
      });

      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!res.ok) return false;

      const data = await res.json() as any;
      this.accessToken = data.access_token;
      // expires_in is in seconds
      this.tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
      return true;
    } catch {
      return false;
    }
  }

  private async ensureToken(): Promise<void> {
    // Re-authenticate if token is expired or missing (with 60s buffer)
    if (!this.accessToken || Date.now() > this.tokenExpiresAt - 60_000) {
      await this.authenticate();
    }
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async fetchCertificates(since?: Date): Promise<RawCertificate[]> {
    await this.ensureToken();
    const params = since ? `?updated_since=${since.toISOString()}` : '';
    const res = await fetch(`${this.baseUrl}/calibration-records${params}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Keysight fetchCertificates failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.records || []).map(this.mapToRawCertificate);
  }

  async fetchCertificateById(certNumber: string): Promise<RawCertificate> {
    await this.ensureToken();
    const res = await fetch(`${this.baseUrl}/calibration-records/${certNumber}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Keysight fetchCertificateById failed: ${res.status}`);
    return this.mapToRawCertificate(await res.json());
  }

  async fetchCertificatePDF(certNumber: string): Promise<Buffer> {
    await this.ensureToken();
    const res = await fetch(`${this.baseUrl}/calibration-records/${certNumber}/report`, { headers: this.headers });
    if (!res.ok) throw new Error(`Keysight PDF fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async searchBySerialNumber(serial: string): Promise<RawCertificate[]> {
    await this.ensureToken();
    const res = await fetch(`${this.baseUrl}/calibration-records?serial_number=${encodeURIComponent(serial)}`, { headers: this.headers });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.records || []).map(this.mapToRawCertificate);
  }

  async searchByCustomerReference(ref: string): Promise<RawCertificate[]> {
    await this.ensureToken();
    const res = await fetch(`${this.baseUrl}/calibration-records?customer_reference=${encodeURIComponent(ref)}`, { headers: this.headers });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.records || []).map(this.mapToRawCertificate);
  }

  async getCalibrationStatus(serial: string): Promise<{ status: string; nextDue: Date; lastCert: string }> {
    await this.ensureToken();
    const res = await fetch(`${this.baseUrl}/instruments/${encodeURIComponent(serial)}/calibration-status`, { headers: this.headers });
    if (!res.ok) {
      const certs = await this.searchBySerialNumber(serial);
      if (!certs.length) throw new Error(`No calibration found for serial: ${serial}`);
      const latest = certs[0];
      return {
        status: latest.overallResult,
        nextDue: latest.nextCalibrationDate ? new Date(latest.nextCalibrationDate) : new Date(),
        lastCert: latest.certificateNumber,
      };
    }
    const data = await res.json() as any;
    return {
      status: data.status,
      nextDue: new Date(data.next_calibration_due),
      lastCert: data.last_certificate_number,
    };
  }

  private mapToRawCertificate(raw: any): RawCertificate {
    return {
      certificateNumber: raw.certificate_number || raw.record_id || raw.id,
      calibrationDate: raw.calibration_date || raw.performed_date,
      nextCalibrationDate: raw.next_calibration_date || raw.due_date,
      instrumentSerial: raw.instrument?.serial_number || raw.serial_number || '',
      instrumentDescription: raw.instrument?.description || raw.instrument?.product_name || '',
      instrumentManufacturer: raw.instrument?.manufacturer || 'Keysight Technologies',
      instrumentModel: raw.instrument?.model_number || raw.instrument?.model,
      overallResult: raw.calibration_status === 'PASS' ? 'PASS'
        : raw.calibration_status === 'ADJUSTED' ? 'ADJUSTED_PASS'
        : 'FAIL',
      results: (raw.measurement_data || raw.results || []).map((r: any) => ({
        parameter: r.parameter || r.test_point,
        nominalValue: r.nominal ?? r.reference_value,
        measuredValue: r.measured ?? r.reading,
        unit: r.unit,
        toleranceLow: r.lower_tolerance ?? r.tolerance_low,
        toleranceHigh: r.upper_tolerance ?? r.tolerance_high,
        uncertainty: r.measurement_uncertainty ?? r.uncertainty,
        pass: r.pass || r.within_tolerance,
      })),
      referenceStandards: (raw.standards_used || raw.reference_standards || []).map((s: any) => ({
        standard: s.standard_id || s.name,
        traceableTo: s.traceable_to || s.traceability_chain,
      })),
      environmentalConditions: raw.environmental_conditions ? {
        temperature: raw.environmental_conditions.temperature_c ?? raw.environmental_conditions.temperature,
        humidity: raw.environmental_conditions.relative_humidity ?? raw.environmental_conditions.humidity,
        pressure: raw.environmental_conditions.barometric_pressure ?? raw.environmental_conditions.pressure,
      } : undefined,
      pdfUrl: raw.report_url || raw.certificate_url,
      rawData: raw,
    };
  }
}
