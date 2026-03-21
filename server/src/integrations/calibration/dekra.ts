import { CalibrationProviderConnector, RawCertificate } from "./index";

export class DekraConnector implements CalibrationProviderConnector {
  providerId = "DEKRA";
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { baseUrl?: string; apiKey: string }) {
    this.baseUrl = config.baseUrl || "https://api.dekra.com/calibration/v1";
    this.apiKey = config.apiKey;
  }

  async authenticate(): Promise<boolean> {
    // DEKRA uses API key in X-API-Key header — validate by calling the /me or /ping endpoint
    try {
      const res = await fetch(`${this.baseUrl}/me`, { headers: this.headers });
      return res.ok;
    } catch {
      return false;
    }
  }

  private get headers() {
    return {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async fetchCertificates(since?: Date): Promise<RawCertificate[]> {
    const params = since ? `?modified_after=${since.toISOString()}` : '';
    const res = await fetch(`${this.baseUrl}/zertifikate${params}`, { headers: this.headers });
    if (!res.ok) throw new Error(`DEKRA fetchCertificates failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.Zertifikate || data.zertifikate || []).map(this.mapToRawCertificate);
  }

  async fetchCertificateById(certNumber: string): Promise<RawCertificate> {
    const res = await fetch(`${this.baseUrl}/zertifikate/${encodeURIComponent(certNumber)}`, { headers: this.headers });
    if (!res.ok) throw new Error(`DEKRA fetchCertificateById failed: ${res.status}`);
    return this.mapToRawCertificate(await res.json());
  }

  async fetchCertificatePDF(certNumber: string): Promise<Buffer> {
    const res = await fetch(`${this.baseUrl}/zertifikate/${encodeURIComponent(certNumber)}/pdf`, { headers: this.headers });
    if (!res.ok) throw new Error(`DEKRA PDF fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  async searchBySerialNumber(serial: string): Promise<RawCertificate[]> {
    const res = await fetch(`${this.baseUrl}/zertifikate?seriennummer=${encodeURIComponent(serial)}`, { headers: this.headers });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.Zertifikate || data.zertifikate || []).map(this.mapToRawCertificate);
  }

  async searchByCustomerReference(ref: string): Promise<RawCertificate[]> {
    const res = await fetch(`${this.baseUrl}/zertifikate?kundenreferenz=${encodeURIComponent(ref)}`, { headers: this.headers });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data.Zertifikate || data.zertifikate || []).map(this.mapToRawCertificate);
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

  private mapToRawCertificate(raw: any): RawCertificate {
    // DEKRA German field mapping:
    // Zertifikat.Nummer -> certificateNumber
    // Pruefung.Datum    -> calibrationDate
    // Pruefung.NaechstesDatum -> nextCalibrationDate
    // Pruefgegenstand.Seriennummer -> instrumentSerial
    // Pruefgegenstand.Bezeichnung  -> instrumentDescription
    // Pruefgegenstand.Hersteller   -> instrumentManufacturer
    // Pruefgegenstand.Modell       -> instrumentModel
    const zertifikat = raw.Zertifikat || raw;
    const pruefung = raw.Pruefung || raw;
    const pruefgegenstand = raw.Pruefgegenstand || raw.instrument || raw;

    return {
      certificateNumber: zertifikat.Nummer || raw.certificate_number || raw.id,
      calibrationDate: pruefung.Datum || raw.calibration_date,
      nextCalibrationDate: pruefung.NaechstesDatum || raw.next_calibration_date,
      instrumentSerial: pruefgegenstand.Seriennummer || pruefgegenstand.serial_number || '',
      instrumentDescription: pruefgegenstand.Bezeichnung || pruefgegenstand.description || '',
      instrumentManufacturer: pruefgegenstand.Hersteller || pruefgegenstand.manufacturer,
      instrumentModel: pruefgegenstand.Modell || pruefgegenstand.model,
      overallResult: (raw.Ergebnis || raw.result) === 'BESTANDEN' || (raw.Ergebnis || raw.result) === 'PASS'
        ? 'PASS'
        : (raw.Ergebnis || raw.result) === 'JUSTIERT' || (raw.Ergebnis || raw.result) === 'ADJUSTED'
        ? 'ADJUSTED_PASS'
        : 'FAIL',
      results: (raw.Messergebnisse || raw.measurement_results || []).map((r: any) => ({
        parameter: r.Parameter || r.parameter,
        nominalValue: r.Sollwert ?? r.nominal_value ?? r.nominal,
        measuredValue: r.Istwert ?? r.measured_value ?? r.measured,
        unit: r.Einheit || r.unit,
        toleranceLow: r.ToleranzUnten ?? r.tolerance_low,
        toleranceHigh: r.ToleranzOben ?? r.tolerance_high,
        uncertainty: r.Messunsicherheit ?? r.uncertainty,
        pass: r.Bestanden === true || r.pass === true,
      })),
      referenceStandards: (raw.Referenzstandards || raw.reference_standards || []).map((s: any) => ({
        standard: s.Standard || s.standard,
        traceableTo: s.RueckfuehrbarAuf || s.traceable_to,
      })),
      environmentalConditions: (raw.Umgebungsbedingungen || raw.environmental_conditions) ? {
        temperature: (raw.Umgebungsbedingungen || raw.environmental_conditions)?.Temperatur
          ?? (raw.Umgebungsbedingungen || raw.environmental_conditions)?.temperature,
        humidity: (raw.Umgebungsbedingungen || raw.environmental_conditions)?.Luftfeuchtigkeit
          ?? (raw.Umgebungsbedingungen || raw.environmental_conditions)?.humidity,
        pressure: (raw.Umgebungsbedingungen || raw.environmental_conditions)?.Luftdruck
          ?? (raw.Umgebungsbedingungen || raw.environmental_conditions)?.pressure,
      } : undefined,
      pdfUrl: raw.PdfUrl || raw.pdf_url,
      rawData: raw,
    };
  }
}
