export interface RawCertificate {
  certificateNumber: string;
  calibrationDate: string;
  nextCalibrationDate?: string;
  instrumentSerial: string;
  instrumentDescription: string;
  instrumentManufacturer?: string;
  instrumentModel?: string;
  results: Array<{
    parameter: string;
    nominalValue: number;
    measuredValue: number;
    unit: string;
    toleranceLow?: number;
    toleranceHigh?: number;
    uncertainty?: number;
    pass: boolean;
  }>;
  overallResult: 'PASS' | 'FAIL' | 'ADJUSTED_PASS';
  referenceStandards: Array<{ standard: string; traceableTo: string }>;
  environmentalConditions?: { temperature?: number; humidity?: number; pressure?: number };
  pdfUrl?: string;
  rawData?: any;
}

export interface CalibrationProviderConnector {
  providerId: string;
  authenticate(): Promise<boolean>;
  fetchCertificates(since?: Date): Promise<RawCertificate[]>;
  fetchCertificateById(certNumber: string): Promise<RawCertificate>;
  fetchCertificatePDF(certNumber: string): Promise<Buffer>;
  searchBySerialNumber(serial: string): Promise<RawCertificate[]>;
  searchByCustomerReference(ref: string): Promise<RawCertificate[]>;
  getCalibrationStatus(serial: string): Promise<{ status: string; nextDue: Date; lastCert: string }>;
  registerWebhook?(callbackUrl: string, events: string[]): Promise<void>;
}
