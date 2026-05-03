import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

/**
 * Minimal valid 1-page PDF (~700 bytes). Renders blank in any PDF viewer.
 * Avoids checking a binary into the repo.
 */
const MINIMAL_PDF =
  '%PDF-1.4\n' +
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<<>>>>endobj\n' +
  '4 0 obj<</Length 44>>stream\n' +
  'BT /F1 12 Tf 100 700 Td (Dev sample receipt) Tj ET\n' +
  'endstream endobj\n' +
  'xref\n0 5\n' +
  '0000000000 65535 f \n' +
  '0000000009 00000 n \n' +
  '0000000052 00000 n \n' +
  '0000000095 00000 n \n' +
  '0000000178 00000 n \n' +
  'trailer<</Size 5/Root 1 0 R>>\n' +
  'startxref\n267\n%%EOF';

export function writePlaceholderPdf(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, MINIMAL_PDF, 'utf8');
}
