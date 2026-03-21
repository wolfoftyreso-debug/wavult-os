import { RawCertificate } from "./index";

// DCC namespace
const DCC_NS = "https://ptb.de/dcc/v2.4.0";
const DS_NS = "http://www.w3.org/2000/09/xmldsig#";

export interface DCCParseResult {
  certificate: RawCertificate;
  rawXml: string;
  signaturePresent: boolean;
  signatureValid: boolean | null; // null = not checked
  schemaValid: boolean;
  parseErrors: string[];
}

export async function parseDCCXml(xmlContent: string): Promise<DCCParseResult> {
  // Use the built-in DOMParser or a Node.js XML parser
  // Since we're in Node.js, use a simple regex/string-based extraction approach
  // as a skeleton (full implementation would use fast-xml-parser or xmldom)

  const result: DCCParseResult = {
    certificate: {
      certificateNumber: '',
      calibrationDate: '',
      instrumentSerial: '',
      instrumentDescription: '',
      results: [],
      overallResult: 'PASS',
      referenceStandards: [],
    },
    rawXml: xmlContent,
    signaturePresent: false,
    signatureValid: null,
    schemaValid: false,
    parseErrors: [],
  };

  try {
    // Extract key fields using regex on the XML (skeleton — production would use proper XML parser)
    // certificateNumber
    const certNumMatch = xmlContent.match(/<dcc:uniqueIdentifier[^>]*>(.*?)<\/dcc:uniqueIdentifier>/s);
    if (certNumMatch) result.certificate.certificateNumber = certNumMatch[1].trim();

    // calibrationDate
    const dateMatch = xmlContent.match(/<dcc:endPerformanceDate[^>]*>(.*?)<\/dcc:endPerformanceDate>/s);
    if (dateMatch) result.certificate.calibrationDate = dateMatch[1].trim().substring(0, 10);

    // instrument serial
    const serialMatch = xmlContent.match(/<dcc:identification[^>]*>[\s\S]*?<dcc:issuer[^>]*>manufacturer<\/dcc:issuer>[\s\S]*?<dcc:value[^>]*>(.*?)<\/dcc:value>/s);
    if (serialMatch) result.certificate.instrumentSerial = serialMatch[1].trim();

    // instrument manufacturer
    const mfgMatch = xmlContent.match(/<dcc:manufacturer>[\s\S]*?<dcc:content[^>]*>(.*?)<\/dcc:content>/s);
    if (mfgMatch) result.certificate.instrumentManufacturer = mfgMatch[1].trim();

    // Check for digital signature
    result.signaturePresent = xmlContent.includes('<ds:Signature') || xmlContent.includes('<Signature');

    // Overall result — DCC doesn't have a binary pass/fail at root level
    // Derive from measurement results
    const failMatches = xmlContent.match(/pass[^>]*>false/gi);
    result.certificate.overallResult = (failMatches && failMatches.length > 0) ? 'FAIL' : 'PASS';

    result.schemaValid = result.certificate.certificateNumber !== '';
  } catch (err: any) {
    result.parseErrors.push(err.message);
  }

  return result;
}

export async function validateDCCSignature(xmlContent: string): Promise<boolean> {
  // Skeleton for X.509 signature validation
  // Production: use xmldsig or node-forge to verify ds:Signature
  // Returns false as skeleton until implemented
  console.log('[DCC] Signature validation not yet implemented — requires xmldsig library');
  return false;
}
