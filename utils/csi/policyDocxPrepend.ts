import * as fs from 'fs';
import JSZip from 'jszip';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Prepends one paragraph to `word/document.xml` inside a .docx (OOXML `w:body`). */
export async function prependLineToDocx(params: {
  sourcePath: string;
  destPath: string;
  line: string;
}): Promise<void> {
  const buf = fs.readFileSync(params.sourcePath);
  const zip = await JSZip.loadAsync(buf);
  const entry = zip.file('word/document.xml');
  if (entry == null) {
    throw new Error('word/document.xml not found in docx');
  }
  let xml = await entry.async('string');
  const para = `<w:p><w:r><w:t>${escapeXml(params.line)}</w:t></w:r></w:p>`;
  const match = xml.match(/<w:body\b[^>]*>/);
  if (match == null || match.index === undefined) {
    throw new Error('w:body not found in word/document.xml');
  }
  xml = xml.slice(0, match.index + match[0].length) + para + xml.slice(match.index + match[0].length);
  zip.file('word/document.xml', xml);
  const out = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(params.destPath, out);
}
