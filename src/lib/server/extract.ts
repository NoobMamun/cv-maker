import "server-only";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MIN_TEXT_CHARS = 80;
export const MAX_TEXT_CHARS = 60_000;

export class ParseError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}

export type DocKind = "pdf" | "docx" | "txt";

/** Decide the format from magic bytes first, extension second. Never trust the browser MIME type alone. */
export function detectKind(bytes: Uint8Array, fileName: string): DocKind {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const head = String.fromCharCode(...bytes.slice(0, 5));
  if (head.startsWith("%PDF")) return "pdf";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    if (ext === "docx" || ext === "") return "docx";
    throw new ParseError("This looks like a ZIP-based file that isn't a .docx. Please upload a PDF or Word (.docx) file.", 415);
  }
  // Legacy Word 97-2003 (OLE compound file)
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    throw new ParseError("Old Word (.doc) files aren't supported. Open it in Word and use Save As → .docx, or export to PDF.", 415);
  }
  if (ext === "txt" || ext === "md") return "txt";
  throw new ParseError("Unsupported file type. Please upload a PDF or Word (.docx) file.", 415);
}

function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractText(bytes: Uint8Array, fileName: string): Promise<{ text: string; kind: DocKind; pages?: number }> {
  if (bytes.byteLength === 0) throw new ParseError("The file is empty.");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new ParseError("File is larger than 5 MB.", 413);

  const kind = detectKind(bytes, fileName);
  let text = "";
  let pages: number | undefined;

  try {
    if (kind === "pdf") {
      const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const result = await pdfText(pdf, { mergePages: true });
      text = result.text;
      pages = result.totalPages;
    } else if (kind === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      text = result.value;
    } else {
      text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/password/i.test(msg)) throw new ParseError("This PDF is password-protected. Please remove the password and try again.");
    throw new ParseError("We couldn't read this file. It may be corrupted. Try re-exporting it as PDF or .docx.");
  }

  text = tidy(text);
  if (text.length < MIN_TEXT_CHARS) {
    throw new ParseError(
      kind === "pdf"
        ? "We couldn't find selectable text in this PDF. It may be a scanned image. Please upload a text-based PDF or a .docx file."
        : "The document has too little text to analyse.",
    );
  }
  return { text: text.slice(0, MAX_TEXT_CHARS), kind, pages };
}
