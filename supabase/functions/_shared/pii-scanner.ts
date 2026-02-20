import nlp from "https://esm.sh/compromise@14.10.0";

/**
 * PII Scanner Module
 * Detects and redacts sensitive information from text strings.
 * Reference: byom 3.md §4 (Safety Hardening)
 */

export interface PiiResult {
  hasPii: boolean;
  redactedText: string;
  detectedTypes: string[];
}

export class PiiScanner {
  /**
   * Scans text for PII (Email, Phone, URL) and redacts it.
   * Uses 'compromise' NLP library for pattern matching.
   */
  public static scan(text: string): PiiResult {
    const doc = nlp(text);
    const detected: Set<string> = new Set();
    let hasPii = false;

    // Detect typical PII entities
    const emails = doc.emails();
    const phones = doc.phoneNumbers();
    const urls = doc.urls();

    if (emails.found) {
      detected.add("email");
      hasPii = true;
      doc.emails().replace("[REDACTED_EMAIL]");
    }

    if (phones.found) {
      detected.add("phone");
      hasPii = true;
      doc.phoneNumbers().replace("[REDACTED_PHONE]");
    }

    if (urls.found) {
      detected.add("url");
      hasPii = true;
      doc.urls().replace("[REDACTED_URL]");
    }

    return {
      hasPii,
      redactedText: doc.text(),
      detectedTypes: Array.from(detected),
    };
  }
}
