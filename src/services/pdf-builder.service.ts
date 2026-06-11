function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');
}

function wrapLine(line: string, maxChars = 92): string[] {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [''];
  }

  const wrapped: string[] = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index];
    if ((current + ' ' + word).length <= maxChars) {
      current += ` ${word}`;
    } else {
      wrapped.push(current);
      current = word;
    }
  }

  wrapped.push(current);
  return wrapped;
}

function chunkLines(lines: string[], maxLinesPerPage: number): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    current.push(line);
    if (current.length >= maxLinesPerPage) {
      pages.push(current);
      current = [];
    }
  }

  if (current.length > 0 || pages.length === 0) {
    pages.push(current);
  }

  return pages;
}

function buildContentStream(lines: string[]): string {
  const lineHeight = 14;
  const startY = 760;
  const escapedLines = lines.map(escapePdfText);
  const contentLines: string[] = ['BT', '/F1 11 Tf'];

  escapedLines.forEach((line, index) => {
    const y = startY - index * lineHeight;
    contentLines.push(`1 0 0 1 48 ${y} Tm`);
    contentLines.push(`(${line}) Tj`);
  });

  contentLines.push('ET');
  return contentLines.join('\n');
}

export function buildSimplePdf(lines: string[]): Buffer {
  const wrappedLines = lines.flatMap((line) => wrapLine(line));
  const pages = chunkLines(wrappedLines, 48);
  const fontObjectId = 1;
  const contentStartId = 2;
  const pageStartId = contentStartId + pages.length;
  const pagesObjectId = pageStartId + pages.length;
  const catalogObjectId = pagesObjectId + 1;

  const objects: string[] = [];
  objects[fontObjectId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  pages.forEach((pageLines, index) => {
    const contentId = contentStartId + index;
    const pageId = pageStartId + index;
    const content = buildContentStream(pageLines);
    objects[contentId] = `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentId} 0 R >>`;
  });

  objects[pagesObjectId] = `<< /Type /Pages /Kids [${pages.map((_page, index) => `${pageStartId + index} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[catalogObjectId] = `<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`;

  const parts: string[] = ['%PDF-1.4\n'];
  const offsets: number[] = [0];

  for (let index = 1; index <= catalogObjectId; index += 1) {
    const object = objects[index];
    if (!object) {
      throw new Error(`Missing PDF object ${index}`);
    }

    offsets[index] = Buffer.byteLength(parts.join(''), 'utf8');
    parts.push(`${index} 0 obj\n${object}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(parts.join(''), 'utf8');
  const xrefLines = ['xref', `0 ${catalogObjectId + 1}`, '0000000000 65535 f '];

  for (let index = 1; index <= catalogObjectId; index += 1) {
    xrefLines.push(`${String(offsets[index]).padStart(10, '0')} 00000 n `);
  }

  const trailer = [
    'trailer',
    `<< /Size ${catalogObjectId + 1} /Root ${catalogObjectId} 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF',
  ];

  parts.push(`${xrefLines.join('\n')}\n${trailer.join('\n')}\n`);
  return Buffer.from(parts.join(''), 'utf8');
}
