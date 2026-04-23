/**
 * Extracts raw textual content from a PDF Buffer
 * @param buffer Raw file buffer representing the loaded resume
 * @returns Serialized raw string extracted from the document geometry
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    // Lazy-load pdf-parse to avoid crashing Node 18 at module init time
    // (pdf-parse v1.1.1+ uses pdfjs-dist which references Node 22 APIs at load)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    console.error('[ResumeParserService] Failed to extract PDF raw text:', error);
    throw new Error('PDF structural parsing failed');
  }
}
