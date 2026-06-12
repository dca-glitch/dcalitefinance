import { InvoiceStatus } from '@prisma/client';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT_MARGIN = 40;
const RIGHT_MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;
const TOP_MARGIN = 40;
const BOTTOM_MARGIN = 40;

const NAVY: readonly [number, number, number] = [0.0235, 0.1176, 0.2902];
const PURPLE: readonly [number, number, number] = [0.3333, 0.0078, 0.4078];
const TEXT: readonly [number, number, number] = [0.1098, 0.1373, 0.1804];
const MUTED: readonly [number, number, number] = [0.4353, 0.4824, 0.5529];
const BORDER: readonly [number, number, number] = [0.0235, 0.1176, 0.2902];
const LIGHT_BORDER: readonly [number, number, number] = [0.7333, 0.7725, 0.8392];
const SUMMARY_FILL: readonly [number, number, number] = [0.0235, 0.1176, 0.2902];
const TABLE_HEADER_FILL: readonly [number, number, number] = [0.0235, 0.1176, 0.2902];
interface PdfIssuerProfile {
  issuerDisplayName: string;
  issuerLegalName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
  companyRegistrationNumber: string | null;
  currencyCode: string;
  defaultInvoiceTerms: string | null;
  defaultPaymentInstructions: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankSwift: string | null;
}

interface PdfInvoiceClient {
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  taxId: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
}

interface PdfInvoiceLine {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

interface PdfInvoice {
  invoiceNumber: string;
  currencyCode: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  notes: string | null;
  terms: string | null;
  taxPercent: number;
  taxAmountMinor: number;
  discountMinor: number;
  subtotalMinor: number;
  totalMinor: number;
  client: PdfInvoiceClient | null;
  lines: PdfInvoiceLine[];
}

interface BuildInvoicePdfBufferInput {
  issuerProfile: PdfIssuerProfile;
  invoice: PdfInvoice;
}

type TextAlign = 'left' | 'center' | 'right';

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');
}

function fmt(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function rgb(color: readonly [number, number, number], op = 'rg'): string {
  return `${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} ${op}`;
}

function textWidth(text: string, fontSize: number, bold = false): number {
  const factor = bold ? 0.58 : 0.52;
  return text.length * fontSize * factor;
}

function wrapText(text: string, maxChars: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [''];
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index];
    if ((current + ' ' + word).length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  lines.push(current);
  return lines;
}

function wrapParagraphs(value: string, maxChars: number): string[] {
  const paragraphs = value.split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) {
      lines.push('');
      continue;
    }

    lines.push(...wrapText(paragraph, maxChars));
  }

  return lines.length > 0 ? lines : [''];
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

function formatMinorAmount(currencyCode: string, amountMinor: number): string {
  return `${currencyCode} ${(amountMinor / 100).toFixed(2)}`;
}

function formatPercent(value: number): string {
  const rounded = Number(value.toFixed(2));
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toString().replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')}%`;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function rectFill(x: number, y: number, width: number, height: number, color: readonly [number, number, number]): string {
  return [
    'q',
    rgb(color),
    `${fmt(x)} ${fmt(y)} ${fmt(width)} ${fmt(height)} re`,
    'f',
    'Q',
  ].join('\n');
}

function rectStroke(
  x: number,
  y: number,
  width: number,
  height: number,
  color: readonly [number, number, number],
  lineWidth = 1,
): string {
  return [
    'q',
    rgb(color, 'RG'),
    `${fmt(lineWidth)} w`,
    `${fmt(x)} ${fmt(y)} ${fmt(width)} ${fmt(height)} re`,
    'S',
    'Q',
  ].join('\n');
}

function line(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: readonly [number, number, number],
  lineWidth = 1,
): string {
  return [
    'q',
    rgb(color, 'RG'),
    `${fmt(lineWidth)} w`,
    `${fmt(x1)} ${fmt(y1)} m`,
    `${fmt(x2)} ${fmt(y2)} l`,
    'S',
    'Q',
  ].join('\n');
}

function text(
  x: number,
  y: number,
  value: string,
  options: {
    font: 'F1' | 'F2';
    size: number;
    color?: readonly [number, number, number];
    align?: TextAlign;
    width?: number;
  },
): string {
  const color = options.color ?? TEXT;
  const width = options.width ?? 0;
  const estimatedWidth = textWidth(value, options.size, options.font === 'F2');
  let drawX = x;

  if (options.align === 'right') {
    drawX = x - estimatedWidth;
  } else if (options.align === 'center') {
    drawX = x - estimatedWidth / 2;
  }

  if (width > 0 && options.align === 'right') {
    drawX = x - Math.min(estimatedWidth, width);
  }

  return [
    'BT',
    `/${options.font} ${fmt(options.size)} Tf`,
    rgb(color),
    `1 0 0 1 ${fmt(drawX)} ${fmt(y)} Tm`,
    `(${escapePdfText(value)}) Tj`,
    'ET',
  ].join('\n');
}

function multilineText(
  x: number,
  y: number,
  lines: string[],
  options: {
    font: 'F1' | 'F2';
    size: number;
    color?: readonly [number, number, number];
    lineHeight: number;
  },
): string[] {
  const commands: string[] = [];
  let currentY = y;

  for (const lineValue of lines) {
    commands.push(text(x, currentY, lineValue, options));
    currentY -= options.lineHeight;
  }

  return commands;
}

function sectionTitle(value: string): string {
  return value.toUpperCase();
}

function filterLines(values: Array<string | null | undefined>): string[] {
  return values
    .map((value) => normalizeOptionalText(value))
    .filter((value): value is string => Boolean(value));
}

function buildAddressBlock(profile: PdfIssuerProfile): string[] {
  const addressLine = [profile.addressLine1, profile.addressLine2].filter((value): value is string => Boolean(value)).join(', ');
  const localityLine = [profile.city, profile.state, profile.postalCode].filter((value): value is string => Boolean(value)).join(', ');
  const contactLine = [profile.email ? `Email: ${profile.email}` : null, profile.phone ? `Phone: ${profile.phone}` : null, profile.website ? `Web: ${profile.website}` : null]
    .filter((value): value is string => Boolean(value))
    .join(' | ');
  const complianceLine = [profile.taxId ? `Tax ID: ${profile.taxId}` : null, profile.companyRegistrationNumber ? `Registration No.: ${profile.companyRegistrationNumber}` : null]
    .filter((value): value is string => Boolean(value))
    .join(' | ');

  return filterLines([
    addressLine || null,
    localityLine || null,
    profile.country,
    contactLine || null,
    complianceLine || null,
  ]);
}

function buildClientBlock(client: PdfInvoiceClient | null): string[] {
  if (!client) {
    return ['Unknown client'];
  }

  const addressLine = [client.billingAddressLine1, client.billingAddressLine2].filter((value): value is string => Boolean(value)).join(', ');
  const localityLine = [client.billingCity, client.billingState, client.billingPostalCode].filter((value): value is string => Boolean(value)).join(', ');
  const contactLine = [client.email ? `Email: ${client.email}` : null, client.phone ? `Phone: ${client.phone}` : null, client.website ? `Web: ${client.website}` : null]
    .filter((value): value is string => Boolean(value))
    .join(' | ');

  return filterLines([
    client.name,
    addressLine || null,
    localityLine || null,
    client.billingCountry,
    contactLine || null,
    client.taxId ? `Tax ID: ${client.taxId}` : null,
  ]);
}

function buildPaymentDetails(profile: PdfIssuerProfile): string[] {
  return filterLines([
    profile.defaultPaymentInstructions,
    profile.bankAccountName ? `Account name: ${profile.bankAccountName}` : null,
    profile.bankName ? `Bank: ${profile.bankName}` : null,
    profile.bankAccountNumber ? `Account number: ${profile.bankAccountNumber}` : null,
    profile.bankSwift ? `SWIFT: ${profile.bankSwift}` : null,
  ]);
}

function buildNotesBlock(invoice: PdfInvoice): string[] {
  const lines: string[] = [];

  if (normalizeOptionalText(invoice.terms)) {
    lines.push('Terms');
    lines.push(invoice.terms!.trim());
    lines.push('');
  }

  if (normalizeOptionalText(invoice.notes)) {
    lines.push('Notes');
    lines.push(invoice.notes!.trim());
  }

  return lines;
}

function pushTextBlock(
  commands: string[],
  x: number,
  startY: number,
  values: string[],
  options: {
    font?: 'F1' | 'F2';
    size?: number;
    color?: readonly [number, number, number];
    lineHeight?: number;
  } = {},
): number {
  const font = options.font ?? 'F1';
  const size = options.size ?? 9;
  const color = options.color ?? TEXT;
  const lineHeight = options.lineHeight ?? 12;
  let currentY = startY;

  for (const value of values) {
    commands.push(text(x, currentY, value, { font, size, color }));
    currentY -= lineHeight;
  }

  return currentY;
}

function estimateChars(width: number, fontSize: number): number {
  return Math.max(16, Math.floor(width / (fontSize * 0.52)));
}

function tableRows(invoice: PdfInvoice): Array<{
  lineNumber: number;
  descriptionLines: string[];
  quantity: string;
  unitPrice: string;
  amount: string;
  height: number;
}> {
  const descriptionWidth = 246;
  const descriptionChars = estimateChars(descriptionWidth, 9);

  return invoice.lines.map((lineItem) => {
    const description = normalizeOptionalText(lineItem.description) ?? 'Item';
    const descriptionLines = wrapText(description, descriptionChars);
    const rowHeight = Math.max(descriptionLines.length, 1) * 12 + 10;

    return {
      lineNumber: lineItem.lineNumber,
      descriptionLines,
      quantity: String(lineItem.quantity),
      unitPrice: formatMinorAmount(invoiceCurrency(invoice), lineItem.unitPriceMinor),
      amount: formatMinorAmount(invoiceCurrency(invoice), lineItem.lineTotalMinor),
      height: rowHeight,
    };
  });
}

function invoiceCurrency(invoice: PdfInvoice): string {
  return invoice.currencyCode;
}

function buildSummaryLines(invoice: PdfInvoice): Array<{ label: string; amount: string; emphasized?: boolean }> {
  const lines: Array<{ label: string; amount: string; emphasized?: boolean }> = [
    {
      label: 'Subtotal',
      amount: formatMinorAmount(invoiceCurrency(invoice), invoice.subtotalMinor),
    },
  ];

  if (invoice.discountMinor > 0) {
    lines.push({
      label: 'Discount',
      amount: formatMinorAmount(invoiceCurrency(invoice), invoice.discountMinor),
    });
  }

  if (invoice.taxPercent > 0 || invoice.taxAmountMinor > 0) {
    lines.push({
      label: `Tax (${formatPercent(invoice.taxPercent)})`,
      amount: formatMinorAmount(invoiceCurrency(invoice), invoice.taxAmountMinor),
    });
  }

  lines.push({
    label: 'Total',
    amount: formatMinorAmount(invoiceCurrency(invoice), invoice.totalMinor),
    emphasized: true,
  });

  return lines;
}

function buildContentForPage(commands: string[]): string {
  return commands.join('\n');
}

function buildPdfBuffer(pages: string[]): Buffer {
  const fontRegularId = 1;
  const fontBoldId = 2;
  const contentStartId = 3;
  const pageStartId = contentStartId + pages.length;
  const pagesObjectId = pageStartId + pages.length;
  const catalogObjectId = pagesObjectId + 1;

  const objects: string[] = [];
  objects[fontRegularId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[fontBoldId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  pages.forEach((pageContent, index) => {
    const contentId = contentStartId + index;
    const pageId = pageStartId + index;
    objects[contentId] = `<< /Length ${Buffer.byteLength(pageContent, 'utf8')} >>\nstream\n${pageContent}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`;
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

function renderInvoiceHeader(
  commands: string[],
  invoice: PdfInvoice,
  issuerProfile: PdfIssuerProfile,
  topY: number,
): number {
  const issuerName = normalizeOptionalText(issuerProfile.issuerLegalName) ?? issuerProfile.issuerDisplayName;
  const invoiceTitleX = PAGE_WIDTH - RIGHT_MARGIN;
  const metadataX = PAGE_WIDTH - RIGHT_MARGIN;
  const companyBlock = buildAddressBlock(issuerProfile);
  const issuerNameSize = textWidth(issuerName, 18, true) > 250 ? 16 : 18;

  commands.push(text(LEFT_MARGIN, topY, issuerName, { font: 'F2', size: issuerNameSize, color: PURPLE }));
  const issuerBlockBottom = pushTextBlock(commands, LEFT_MARGIN, topY - 18, companyBlock, {
    font: 'F1',
    size: 9,
    color: TEXT,
    lineHeight: 11,
  });

  commands.push(text(invoiceTitleX, topY + 1, 'INVOICE', { font: 'F2', size: 20, color: NAVY, align: 'right' }));

  const metaY = topY - 24;
  const metaLineHeight = 12;
  const metaLabelColor = MUTED;
  const metaValueColor = TEXT;
  const invoiceNumber = invoice.invoiceNumber;
  const issueDate = formatDate(invoice.issueDate);
  const dueDate = formatDate(invoice.dueDate);

  commands.push(text(metadataX, metaY, 'Invoice No.', { font: 'F1', size: 8.5, color: metaLabelColor, align: 'right' }));
  commands.push(text(metadataX, metaY - metaLineHeight, invoiceNumber, { font: 'F2', size: 10.5, color: metaValueColor, align: 'right' }));
  commands.push(text(metadataX, metaY - metaLineHeight * 2.2, 'Issue Date', { font: 'F1', size: 8.5, color: metaLabelColor, align: 'right' }));
  commands.push(text(metadataX, metaY - metaLineHeight * 3.2, issueDate, { font: 'F2', size: 10.5, color: metaValueColor, align: 'right' }));
  commands.push(text(metadataX, metaY - metaLineHeight * 4.4, 'Due Date', { font: 'F1', size: 8.5, color: metaLabelColor, align: 'right' }));
  commands.push(text(metadataX, metaY - metaLineHeight * 5.4, dueDate, { font: 'F2', size: 10.5, color: metaValueColor, align: 'right' }));

  const metadataBottom = metaY - metaLineHeight * 5.4 - 14;
  const dividerY = Math.min(issuerBlockBottom, metadataBottom) - 12;
  commands.push(line(LEFT_MARGIN, dividerY, PAGE_WIDTH - RIGHT_MARGIN, dividerY, NAVY, 1.1));

  const billToTitleY = dividerY - 22;
  commands.push(text(LEFT_MARGIN, billToTitleY, sectionTitle('Bill To'), { font: 'F2', size: 8.2, color: MUTED }));
  const clientBlock = buildClientBlock(invoice.client);
  pushTextBlock(commands, LEFT_MARGIN, billToTitleY - 16, clientBlock, {
    font: 'F1',
    size: 9.2,
    color: TEXT,
    lineHeight: 11,
  });

  return billToTitleY - 16 - clientBlock.length * 11 - 10;
}

function renderTableHeader(commands: string[], tableTopY: number): number {
  const headerHeight = 24;
  const columns = [
    { label: '#', width: 28, align: 'center' as const },
    { label: 'Description', width: 258, align: 'left' as const },
    { label: 'Qty', width: 44, align: 'right' as const },
    { label: 'Unit Price', width: 90, align: 'right' as const },
    { label: 'Amount', width: 95, align: 'right' as const },
  ];

  commands.push(rectFill(LEFT_MARGIN, tableTopY - headerHeight, CONTENT_WIDTH, headerHeight, TABLE_HEADER_FILL));
  commands.push(rectStroke(LEFT_MARGIN, tableTopY - headerHeight, CONTENT_WIDTH, headerHeight, BORDER, 0.8));

  let currentX = LEFT_MARGIN;
  for (const column of columns) {
    const labelX =
      column.align === 'center' ? currentX + column.width / 2 : column.align === 'left' ? currentX + 10 : currentX + column.width - 10;
    commands.push(
      text(labelX, tableTopY - 15, column.label, {
        font: 'F2',
        size: column.label === 'Description' ? 8.6 : 9,
        color: [1, 1, 1],
        align: column.align,
        width: column.width - 16,
      }),
    );
    currentX += column.width;
  }

  return tableTopY - headerHeight;
}

function renderTableRows(
  commands: string[],
  rows: ReturnType<typeof tableRows>,
  tableTopY: number,
  pageBottomLimit: number,
): { bottomY: number; renderedRows: number } {
  const columns = [
    { width: 28, align: 'center' as const, x: LEFT_MARGIN },
    { width: 258, align: 'left' as const, x: LEFT_MARGIN + 28 },
    { width: 44, align: 'right' as const, x: LEFT_MARGIN + 28 + 258 },
    { width: 90, align: 'right' as const, x: LEFT_MARGIN + 28 + 258 + 44 },
    { width: 95, align: 'right' as const, x: LEFT_MARGIN + 28 + 258 + 44 + 90 },
  ];

  let currentY = tableTopY;
  let renderedRows = 0;

  for (const row of rows) {
    if (currentY - row.height < pageBottomLimit) {
      break;
    }

    const rowTop = currentY;
    const rowBottom = rowTop - row.height;
    const descriptionStartY = rowTop - 12;
    const descriptionLines = row.descriptionLines.length > 0 ? row.descriptionLines : [''];

    commands.push(line(LEFT_MARGIN, rowBottom, PAGE_WIDTH - RIGHT_MARGIN, rowBottom, BORDER, 0.7));

    commands.push(
      text(columns[0].x + columns[0].width / 2, rowTop - 15, String(row.lineNumber), {
        font: 'F1',
        size: 9,
        color: TEXT,
        align: 'center',
      }),
    );

    let descY = descriptionStartY;
    for (const descLine of descriptionLines) {
      commands.push(text(columns[1].x + 2, descY, descLine, { font: 'F1', size: 8.9, color: TEXT }));
      descY -= 11;
    }

    commands.push(
      text(columns[2].x + columns[2].width - 10, rowTop - 15, row.quantity, {
        font: 'F1',
        size: 9,
        color: TEXT,
        align: 'right',
      }),
    );
    commands.push(
      text(columns[3].x + columns[3].width - 10, rowTop - 15, row.unitPrice, {
        font: 'F1',
        size: 9,
        color: TEXT,
        align: 'right',
      }),
    );
    commands.push(
      text(columns[4].x + columns[4].width - 10, rowTop - 15, row.amount, {
        font: 'F1',
        size: 9,
        color: TEXT,
        align: 'right',
      }),
    );

    currentY = rowBottom;
    renderedRows += 1;
  }

  return {
    bottomY: currentY,
    renderedRows,
  };
}

function renderTableBorder(commands: string[], tableTopY: number, tableBottomY: number): void {
  const tableHeight = tableTopY - tableBottomY;
  commands.push(rectStroke(LEFT_MARGIN, tableBottomY, CONTENT_WIDTH, tableHeight, BORDER, 0.9));

  const separatorXs = [LEFT_MARGIN + 28, LEFT_MARGIN + 28 + 258, LEFT_MARGIN + 28 + 258 + 44, LEFT_MARGIN + 28 + 258 + 44 + 90];
  for (const x of separatorXs) {
    commands.push(line(x, tableBottomY, x, tableTopY, BORDER, 0.7));
  }
}

function renderSummaryBox(commands: string[], invoice: PdfInvoice, topY: number): number {
  const boxWidth = 210;
  const boxX = PAGE_WIDTH - RIGHT_MARGIN - boxWidth;
  const summaryLines = buildSummaryLines(invoice);
  const lineHeight = 17;
  const padding = 10;
  const totalHeight = padding * 2 + summaryLines.length * lineHeight + 2;

  commands.push(rectStroke(boxX, topY - totalHeight, boxWidth, totalHeight, BORDER, 0.9));

  let currentY = topY - padding - 8;
  for (const [index, summaryLine] of summaryLines.entries()) {
    const isTotal = index === summaryLines.length - 1 && summaryLine.emphasized;
    const rowHeight = isTotal ? 22 : lineHeight;
    const rowY = currentY - (isTotal ? 3 : 0);
    const labelX = boxX + padding;
    const valueX = boxX + boxWidth - padding;

    if (isTotal) {
      commands.push(rectFill(boxX, currentY - 11, boxWidth, rowHeight + 2, SUMMARY_FILL));
      commands.push(
        text(labelX, rowY, summaryLine.label, {
          font: 'F2',
          size: 9.5,
          color: [1, 1, 1],
        }),
      );
      commands.push(
        text(valueX, rowY, summaryLine.amount, {
          font: 'F2',
          size: 9.5,
          color: [1, 1, 1],
          align: 'right',
        }),
      );
    } else {
      commands.push(
        text(labelX, rowY, summaryLine.label, {
          font: 'F1',
          size: 9,
          color: MUTED,
        }),
      );
      commands.push(
        text(valueX, rowY, summaryLine.amount, {
          font: 'F2',
          size: 9,
          color: TEXT,
          align: 'right',
        }),
      );
    }

    currentY -= lineHeight;
  }

  return topY - totalHeight;
}

function renderBottomSections(
  commands: string[],
  issuerProfile: PdfIssuerProfile,
  invoice: PdfInvoice,
  topY: number,
): void {
  const sectionGap = 16;
  const sectionWidth = (CONTENT_WIDTH - sectionGap) / 2;
  const leftX = LEFT_MARGIN;
  const rightX = LEFT_MARGIN + sectionWidth + sectionGap;
  const headingSize = 8;
  const bodySize = 8.7;
  const lineHeight = 11;

  const paymentDetails = buildPaymentDetails(issuerProfile);
  const notes = buildNotesBlock(invoice);

  if (paymentDetails.length > 0) {
    commands.push(text(leftX, topY, sectionTitle('Payment Details'), { font: 'F2', size: headingSize, color: MUTED }));
    let currentY = topY - 14;
    for (const entry of paymentDetails) {
      const wrapped = wrapParagraphs(entry, estimateChars(sectionWidth, bodySize));
      commands.push(...multilineText(leftX, currentY, wrapped, { font: 'F1', size: bodySize, color: TEXT, lineHeight }));
      currentY -= wrapped.length * lineHeight + 1;
    }
  }

  if (notes.length > 0) {
    commands.push(text(rightX, topY, sectionTitle('Notes'), { font: 'F2', size: headingSize, color: MUTED }));
    let currentY = topY - 14;
    let currentLabel: string | null = null;
    let body = '';

    for (const entry of notes) {
      if (entry === 'Terms' || entry === 'Notes') {
        if (currentLabel && body.length > 0) {
          const wrappedBody = wrapParagraphs(body, estimateChars(sectionWidth, bodySize));
          commands.push(text(rightX, currentY, currentLabel, { font: 'F2', size: 8.6, color: TEXT }));
          currentY -= 11;
          commands.push(...multilineText(rightX, currentY, wrappedBody, { font: 'F1', size: bodySize, color: TEXT, lineHeight }));
          currentY -= wrappedBody.length * lineHeight + 4;
        }

        currentLabel = entry;
        body = '';
        continue;
      }

      body += (body.length > 0 ? '\n' : '') + entry;
    }

    if (currentLabel && body.length > 0) {
      const wrappedBody = wrapParagraphs(body, estimateChars(sectionWidth, bodySize));
      commands.push(text(rightX, currentY, currentLabel, { font: 'F2', size: 8.6, color: TEXT }));
      currentY -= 11;
      commands.push(...multilineText(rightX, currentY, wrappedBody, { font: 'F1', size: bodySize, color: TEXT, lineHeight }));
    }
  }
}

export function buildInvoicePdfBuffer(input: BuildInvoicePdfBufferInput): Buffer {
  const issuerProfile: PdfIssuerProfile = {
    issuerDisplayName: normalizeOptionalText(input.issuerProfile.issuerDisplayName) ?? 'Company',
    issuerLegalName: normalizeOptionalText(input.issuerProfile.issuerLegalName),
    addressLine1: normalizeOptionalText(input.issuerProfile.addressLine1),
    addressLine2: normalizeOptionalText(input.issuerProfile.addressLine2),
    city: normalizeOptionalText(input.issuerProfile.city),
    state: normalizeOptionalText(input.issuerProfile.state),
    postalCode: normalizeOptionalText(input.issuerProfile.postalCode),
    country: normalizeOptionalText(input.issuerProfile.country),
    email: normalizeOptionalText(input.issuerProfile.email),
    phone: normalizeOptionalText(input.issuerProfile.phone),
    website: normalizeOptionalText(input.issuerProfile.website),
    taxId: normalizeOptionalText(input.issuerProfile.taxId),
    companyRegistrationNumber: normalizeOptionalText(input.issuerProfile.companyRegistrationNumber),
    currencyCode: normalizeOptionalText(input.issuerProfile.currencyCode) ?? 'USD',
    defaultInvoiceTerms: normalizeOptionalText(input.issuerProfile.defaultInvoiceTerms),
    defaultPaymentInstructions: normalizeOptionalText(input.issuerProfile.defaultPaymentInstructions),
    bankAccountName: normalizeOptionalText(input.issuerProfile.bankAccountName),
    bankName: normalizeOptionalText(input.issuerProfile.bankName),
    bankAccountNumber: normalizeOptionalText(input.issuerProfile.bankAccountNumber),
    bankSwift: normalizeOptionalText(input.issuerProfile.bankSwift),
  };

  const invoice: PdfInvoice = {
    invoiceNumber: input.invoice.invoiceNumber,
    currencyCode: issuerProfile.currencyCode,
    status: input.invoice.status,
    issueDate: input.invoice.issueDate,
    dueDate: input.invoice.dueDate,
    notes: normalizeOptionalText(input.invoice.notes),
    terms: normalizeOptionalText(input.invoice.terms) ?? issuerProfile.defaultInvoiceTerms,
    taxPercent: input.invoice.taxPercent,
    taxAmountMinor: input.invoice.taxAmountMinor,
    discountMinor: input.invoice.discountMinor,
    subtotalMinor: input.invoice.subtotalMinor,
    totalMinor: input.invoice.totalMinor,
    client: input.invoice.client
      ? {
          name: normalizeOptionalText(input.invoice.client.name) ?? 'Client',
          email: normalizeOptionalText(input.invoice.client.email),
          phone: normalizeOptionalText(input.invoice.client.phone),
          website: normalizeOptionalText(input.invoice.client.website),
          taxId: normalizeOptionalText(input.invoice.client.taxId),
          billingAddressLine1: normalizeOptionalText(input.invoice.client.billingAddressLine1),
          billingAddressLine2: normalizeOptionalText(input.invoice.client.billingAddressLine2),
          billingCity: normalizeOptionalText(input.invoice.client.billingCity),
          billingState: normalizeOptionalText(input.invoice.client.billingState),
          billingPostalCode: normalizeOptionalText(input.invoice.client.billingPostalCode),
          billingCountry: normalizeOptionalText(input.invoice.client.billingCountry),
        }
      : null,
    lines: input.invoice.lines.map((line) => ({
      lineNumber: line.lineNumber,
      description: normalizeOptionalText(line.description) ?? 'Item',
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
      lineTotalMinor: line.lineTotalMinor,
    })),
  };

  const rows = tableRows(invoice);
  const pages: string[] = [];
  let remainingRows = rows;

  while (pages.length === 0 || remainingRows.length > 0) {
    const commands: string[] = [];
    const headerBottomY = renderInvoiceHeader(commands, invoice, issuerProfile, PAGE_HEIGHT - TOP_MARGIN - 8);
    const tableHeaderTopY = headerBottomY - 20;
    const tableTopY = renderTableHeader(commands, tableHeaderTopY);
    const pageBottomLimit = BOTTOM_MARGIN + 250;
    const rowResult = renderTableRows(commands, remainingRows, tableTopY, pageBottomLimit);
    renderTableBorder(commands, tableHeaderTopY, rowResult.bottomY);

    remainingRows = remainingRows.slice(rowResult.renderedRows);

    if (remainingRows.length === 0) {
      const summaryTopY = rowResult.bottomY - 20;
      const summaryBottomY = renderSummaryBox(commands, invoice, summaryTopY);
      const separatorY = summaryBottomY - 18;
      commands.push(line(LEFT_MARGIN, separatorY, PAGE_WIDTH - RIGHT_MARGIN, separatorY, LIGHT_BORDER, 0.7));
      renderBottomSections(commands, issuerProfile, invoice, separatorY - 14);
    }

    pages.push(buildContentForPage(commands));
  }

  return buildPdfBuffer(pages);
}
