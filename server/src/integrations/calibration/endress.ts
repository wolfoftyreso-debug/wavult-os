import { CalibrationProviderConnector, RawCertificate } from "./index";

export class EndressHauserConnector implements CalibrationProviderConnector {
  providerId = "ENDRESS_HAUSER";
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: { baseUrl?: string; clientId: string; clientSecret: string }) {
    this.baseUrl = config.baseUrl || "https://api.netilion.endress.com/v1";
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  async authenticate(): Promise<boolean> {
    // Netilion uses OAuth2 client_credentials flow
    try {
      const tokenUrl = "https://api.netilion.endress.com/oauth/token";
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!res.ok) return false;

      const data = await res.json() as any;
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
      return true;
    } catch {
      return false;
    }
  }

  private async ensureToken(): Promise<void> {
    if (!this.accessToken || Date.now() > this.tokenExpiresAt - 60_000) {
      await this.authenticate();
    }
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async fetchCertificates(since?: Date): Promise<RawCertificate[]> {
    await this.ensureToken();
    // Netilion stores calibration documents as asset documents
    const params = since ? `?updated_after=${since.toISOString()}&document_category=calibration` : '?document_category=calibration';
    const res = await fetch(`${this.baseUrl}/documents${params}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Netilion fetchCertificates failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.documents || []).map(this.mapToRawCertificate);
  }

  async fetchCertificateById(certNumber: string): Promise<RawCertificate> {
    await this.ensureToken();
    const res = await fetch(`${this.baseUrl}/documents/${certNumber}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Netilion fetchCertificateById failed: ${res.status}`);
    return this.mapToRawCertificate(await res.json());
  }

  async fetchCertificatePDF(certNumber: string): Promise<Buffer> {
    await this.ensureToken();
    // Netilion stores document files with a separate download endpoint
    const res = await fetch(`${this.baseUrl}/documents/${certNumber}/download`, { headers: this.headers });
    if (!res.ok) throw new Error(`Netilion PDF fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async searchBySerialNumber(serial: string): Promise<RawCertificate[]> {
    await this.ensureToken();
    // First find the asset by serial number, then fetch its calibration documents
    const assetRes = await fetch(`${this.baseUrl}/assets?serial_number=${encodeURIComponent(serial)}`, { headers: this.headers });
    if (!assetRes.ok) return [];
    const assetData = await assetRes.json() as any;
    const assets: any[] = assetData.assets || [];
    if (!assets.length) return [];

    const assetId = assets[0].id;
    const docsRes = await fetch(`${this.baseUrl}/assets/${assetId}/documents?document_category=calibration`, { headers: this.headers });
    if (!docsRes.ok) return [];
    const docsData = await docsRes.json() as any;
    return (docsData.documents || []).map((doc: any) => this.mapToRawCertificate({ ...doc, asset: assets[0] }));
  }

  async searchByCustomerReference(ref: string): Promise<RawCertificate[]> {
    await this.ensureToken();
    const res = await fetch(`${this.baseUrl}/documents?document_category=calibration&name=${encodeURIComponent(ref)}`, { headers: this.headers });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.documents || []).map(this.mapToRawCertificate);
  }

  async getCalibrationStatus(serial: string): Promise<{ status: string; nextDue: Date; lastCert: string }> {
    await this.ensureToken();
    // Netilion IoT platform — use /assets/{id}/health_conditions for real-time calibration status
    const assetRes = await fetch(`${this.baseUrl}/assets?serial_number=${encodeURIComponent(serial)}`, { headers: this.headers });
    if (!assetRes.ok) throw new Error(`Netilion asset lookup failed: ${assetRes.status}`);
    const assetData = await assetRes.json() as any;
    const assets: any[] = assetData.assets || [];
    if (!assets.length) throw new Error(`No asset found for serial: ${serial}`);

    const assetId = assets[0].id;

    // Use the health_conditions endpoint for calibration status — Netilion-specific IoT endpoint
    const healthRes = await fetch(`${this.baseUrl}/assets/${assetId}/health_conditions`, { headers: this.headers });
    if (healthRes.ok) {
      const healthData = await healthRes.json() as any;
      const calibrationCondition = (healthData.health_conditions || []).find(
        (hc: any) => hc.type === 'calibration' || hc.category === 'calibration'
      );

      if (calibrationCondition) {
        return {
          status: calibrationCondition.status || 'UNKNOWN',
          nextDue: calibrationCondition.next_calibration_date
            ? new Date(calibrationCondition.next_calibration_date)
            : new Date(),
          lastCert: calibrationCondition.last_certificate_id || '',
        };
      }
    }

    // Fallback: derive from latest calibration document
    const certs = await this.searchBySerialNumber(serial);
    if (!certs.length) throw new Error(`No calibration found for serial: ${serial}`);
    const latest = certs[0];
    return {
      status: latest.overallResult,
      nextDue: latest.nextCalibrationDate ? new Date(latest.nextCalibrationDate) : new Date(),
      lastCert: latest.certificateNumber,
    };
  }

  async registerWebhook(callbackUrl: string, events: string[]): Promise<void> {
    await this.ensureToken();
    await fetch(`${this.baseUrl}/webhooks`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        url: callbackUrl,
        event_types: events,
      }),
    });
  }

  private mapToRawCertificate(raw: any): RawCertificate {
    // Netilion document model
    const asset = raw.asset || raw.assets?.[0];
    return {
      certificateNumber: raw.document_number || raw.name || raw.id?.toString() || '',
      calibrationDate: raw.document_date || raw.created_at,
      nextCalibrationDate: raw.valid_until || raw.next_calibration_date,
      instrumentSerial: asset?.serial_number || raw.serial_number || '',
      instrumentDescription: asset?.description || asset?.product?.name || '',
      instrumentManufacturer: asset?.manufacturer?.name || 'Endress+Hauser',
      instrumentModel: asset?.product?.product_code || asset?.product?.model,
      overallResult: raw.calibration_result === 'PASS' || raw.status === 'calibrated' ? 'PASS'
        : raw.calibration_result === 'ADJUSTED' ? 'ADJUSTED_PASS'
        : raw.status === 'calibration_failed' ? 'FAIL'
        : 'PASS',
      results: (raw.measurement_results || raw.calibration_data || []).map((r: any) => ({
        parameter: r.parameter || r.name,
        nominalValue: r.nominal_value ?? r.reference,
        measuredValue: r.measured_value ?? r.value,
        unit: r.unit?.symbol || r.unit,
        toleranceLow: r.lower_limit ?? r.tolerance_min,
        toleranceHigh: r.upper_limit ?? r.tolerance_max,
        uncertainty: r.uncertainty,
        pass: r.pass ?? (r.status === 'pass'),
      })),
      referenceStandards: (raw.reference_standards || raw.calibration_standards || []).map((s: any) => ({
        standard: s.standard || s.name,
        traceableTo: s.traceable_to || s.traceability,
      })),
      environmentalConditions: raw.environmental_conditions ? {
        temperature: raw.environmental_conditions.temperature,
        humidity: raw.environmental_conditions.humidity,
        pressure: raw.environmental_conditions.pressure,
      } : undefined,
      pdfUrl: raw.download_url || raw.pdf_url,
      rawData: raw,
    };
  }
}
