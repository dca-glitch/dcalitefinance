import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { FileAttachmentEntityType, InvoiceStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { buildSimplePdf } from './pdf-builder.service';
import { listFileAttachments, uploadFileAttachment, type SafeFileAttachmentResponse } from './file-attachments.service';

export interface GenerateInvoicePdfInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  invoiceId: string;
}

function invoiceNotFoundError(): AppError {
  return new AppError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
}

function invoicePdfNotAllowedError(): AppError {
  return new AppError('Invoice PDF can only be generated for issued invoices', 400, 'INVOICE_PDF_REQUIRES_ISSUED');
}

function issuerProfileRequiredError(): AppError {
  return new AppError('Issuer profile is required before generating invoice PDFs', 400, 'ISSUER_PROFILE_REQUIRED');
}

function formatMinorAmount(currencyCode: string, amountMinor: number): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'code',
    }).format(amountMinor / 100);
  } catch {
    return `${currencyCode} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildInvoicePdfLines(input: {
  issuerProfile: {
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
    invoiceFooter: string | null;
  };
  invoice: {
    invoiceNumber: string;
    invoiceYear: number;
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
    paidAmountMinor: number;
    balanceDueMinor: number;
    client: {
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
    } | null;
    project: {
      name: string;
    } | null;
    lines: Array<{
      lineNumber: number;
      description: string;
      quantity: number;
      unitPriceMinor: number;
      lineTotalMinor: number;
      serviceItem: { name: string } | null;
    }>;
  };
}): string[] {
  const { issuerProfile, invoice } = input;
  const currency = issuerProfile.currencyCode;
  const lines: string[] = [];

  lines.push('DCA Books Lite Invoice');
  lines.push(`Issuer: ${issuerProfile.issuerDisplayName}`);
  if (issuerProfile.issuerLegalName) lines.push(`Legal Name: ${issuerProfile.issuerLegalName}`);
  const issuerAddress = [issuerProfile.addressLine1, issuerProfile.addressLine2, issuerProfile.city, issuerProfile.state, issuerProfile.postalCode, issuerProfile.country]
    .filter(Boolean)
    .join(', ');
  if (issuerAddress) lines.push(`Address: ${issuerAddress}`);
  if (issuerProfile.email) lines.push(`Email: ${issuerProfile.email}`);
  if (issuerProfile.phone) lines.push(`Phone: ${issuerProfile.phone}`);
  if (issuerProfile.website) lines.push(`Website: ${issuerProfile.website}`);
  if (issuerProfile.taxId) lines.push(`Tax ID: ${issuerProfile.taxId}`);
  if (issuerProfile.companyRegistrationNumber) lines.push(`Registration No.: ${issuerProfile.companyRegistrationNumber}`);
  if (issuerProfile.defaultPaymentInstructions) lines.push(`Payment Instructions: ${issuerProfile.defaultPaymentInstructions}`);
  if (issuerProfile.invoiceFooter) lines.push(`Footer: ${issuerProfile.invoiceFooter}`);
  lines.push('');
  lines.push(`Invoice Number: ${invoice.invoiceNumber}`);
  lines.push(`Issue Date: ${invoice.issueDate.toISOString().slice(0, 10)}`);
  lines.push(`Due Date: ${invoice.dueDate.toISOString().slice(0, 10)}`);
  lines.push(`Status: ${invoice.status}`);
  if (invoice.project) lines.push(`Project: ${invoice.project.name}`);
  lines.push('');
  lines.push('Bill To:');
  if (invoice.client) {
    lines.push(`  ${invoice.client.name}`);
    const clientAddress = [
      invoice.client.billingAddressLine1,
      invoice.client.billingAddressLine2,
      invoice.client.billingCity,
      invoice.client.billingState,
      invoice.client.billingPostalCode,
      invoice.client.billingCountry,
    ]
      .filter(Boolean)
      .join(', ');
    if (clientAddress) lines.push(`  ${clientAddress}`);
    if (invoice.client.email) lines.push(`  Email: ${invoice.client.email}`);
    if (invoice.client.phone) lines.push(`  Phone: ${invoice.client.phone}`);
    if (invoice.client.website) lines.push(`  Website: ${invoice.client.website}`);
    if (invoice.client.taxId) lines.push(`  Tax ID: ${invoice.client.taxId}`);
  } else {
    lines.push('  Unknown client');
  }
  lines.push('');
  lines.push('Line Items:');
  lines.push('  #   Description                           Qty  Unit Price      Total');
  for (const line of invoice.lines) {
    const description = line.serviceItem ? `${line.description} (${line.serviceItem.name})` : line.description;
    lines.push(
      `  ${String(line.lineNumber).padStart(2, ' ')}  ${description} | Qty ${line.quantity} | ${formatMinorAmount(currency, line.unitPriceMinor)} | ${formatMinorAmount(currency, line.lineTotalMinor)}`,
    );
  }
  lines.push('');
  lines.push(`Subtotal: ${formatMinorAmount(currency, invoice.subtotalMinor)}`);
  if (invoice.taxPercent > 0) {
    lines.push(`Tax (${invoice.taxPercent.toFixed(2).replace(/\.00$/, '')}%): ${formatMinorAmount(currency, invoice.taxAmountMinor)}`);
  }
  if (invoice.discountMinor > 0) {
    lines.push(`Discount: ${formatMinorAmount(currency, invoice.discountMinor)}`);
  }
  lines.push(`Total: ${formatMinorAmount(currency, invoice.totalMinor)}`);
  lines.push(`Paid: ${formatMinorAmount(currency, invoice.paidAmountMinor)}`);
  lines.push(`Balance Due: ${formatMinorAmount(currency, invoice.balanceDueMinor)}`);
  const effectiveTerms = invoice.terms ?? issuerProfile.defaultInvoiceTerms;
  if (effectiveTerms) lines.push(`Terms: ${effectiveTerms}`);
  if (invoice.notes) lines.push(`Notes: ${invoice.notes}`);

  return lines;
}

async function loadInvoiceForPdf(tenantId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: {
      tenantId,
      id: invoiceId,
      deletedAt: null,
    },
    select: {
      id: true,
      invoiceNumber: true,
      invoiceYear: true,
      status: true,
      issueDate: true,
      dueDate: true,
      notes: true,
      terms: true,
      taxRateBasisPoints: true,
      taxAmountMinor: true,
      discountMinor: true,
      subtotalMinor: true,
      totalMinor: true,
      paidAmountMinor: true,
      balanceDueMinor: true,
      client: {
        select: {
          name: true,
          email: true,
          phone: true,
          website: true,
          taxId: true,
          billingAddressLine1: true,
          billingAddressLine2: true,
          billingCity: true,
          billingState: true,
          billingPostalCode: true,
          billingCountry: true,
        },
      },
      project: {
        select: {
          name: true,
        },
      },
      lines: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          lineNumber: 'asc',
        },
        select: {
          lineNumber: true,
          description: true,
          quantity: true,
          unitPriceMinor: true,
          lineTotalMinor: true,
          serviceItem: {
            select: {
              name: true,
            },
          },
        },
      },
    } satisfies Prisma.InvoiceSelect,
  });

  if (!invoice) {
    throw invoiceNotFoundError();
  }

  return invoice;
}

export async function listInvoiceDocuments(input: { tenantId: string; invoiceId: string }): Promise<SafeFileAttachmentResponse[]> {
  const invoice = await loadInvoiceForPdf(input.tenantId, input.invoiceId);
  return listFileAttachments({
    tenantId: input.tenantId,
    entityType: FileAttachmentEntityType.INVOICE,
    entityId: invoice.id,
  });
}

export async function generateInvoicePdf(input: GenerateInvoicePdfInput): Promise<SafeFileAttachmentResponse> {
  const invoice = await loadInvoiceForPdf(input.tenantId, input.invoiceId);
  if (invoice.status !== InvoiceStatus.ISSUED) {
    throw invoicePdfNotAllowedError();
  }

  const issuerProfile = await prisma.tenantIssuerProfile.findUnique({
    where: {
      tenantId: input.tenantId,
    },
    select: {
      issuerDisplayName: true,
      issuerLegalName: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      email: true,
      phone: true,
      website: true,
      taxId: true,
      companyRegistrationNumber: true,
      currencyCode: true,
      defaultInvoiceTerms: true,
      defaultPaymentInstructions: true,
      bankAccountName: true,
      bankName: true,
      bankAccountNumber: true,
      bankSwift: true,
      invoiceFooter: true,
    },
  });

  if (!issuerProfile) {
    throw issuerProfileRequiredError();
  }

  const originalFilename = `${invoice.invoiceNumber}.pdf`;
  const existingDocuments = await listFileAttachments({
    tenantId: input.tenantId,
    entityType: FileAttachmentEntityType.INVOICE,
    entityId: invoice.id,
  });
  const existing = existingDocuments.find(
    (document) => document.originalFilename === originalFilename && document.mimeType === 'application/pdf',
  );

  if (existing) {
    return existing;
  }

  const pdfBuffer = buildSimplePdf(
    buildInvoicePdfLines({
      issuerProfile: {
        issuerDisplayName: issuerProfile.issuerDisplayName,
        issuerLegalName: normalizeOptionalText(issuerProfile.issuerLegalName),
        addressLine1: normalizeOptionalText(issuerProfile.addressLine1),
        addressLine2: normalizeOptionalText(issuerProfile.addressLine2),
        city: normalizeOptionalText(issuerProfile.city),
        state: normalizeOptionalText(issuerProfile.state),
        postalCode: normalizeOptionalText(issuerProfile.postalCode),
        country: normalizeOptionalText(issuerProfile.country),
        email: normalizeOptionalText(issuerProfile.email),
        phone: normalizeOptionalText(issuerProfile.phone),
        website: normalizeOptionalText(issuerProfile.website),
        taxId: normalizeOptionalText(issuerProfile.taxId),
        companyRegistrationNumber: normalizeOptionalText(issuerProfile.companyRegistrationNumber),
        currencyCode: issuerProfile.currencyCode,
        defaultInvoiceTerms: normalizeOptionalText(issuerProfile.defaultInvoiceTerms),
        defaultPaymentInstructions: normalizeOptionalText(issuerProfile.defaultPaymentInstructions),
        bankAccountName: normalizeOptionalText(issuerProfile.bankAccountName),
        bankName: normalizeOptionalText(issuerProfile.bankName),
        bankAccountNumber: normalizeOptionalText(issuerProfile.bankAccountNumber),
        bankSwift: normalizeOptionalText(issuerProfile.bankSwift),
        invoiceFooter: normalizeOptionalText(issuerProfile.invoiceFooter),
      },
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        invoiceYear: invoice.invoiceYear,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
        terms: invoice.terms,
        taxPercent: invoice.taxRateBasisPoints / 100,
        taxAmountMinor: invoice.taxAmountMinor,
        discountMinor: invoice.discountMinor,
        subtotalMinor: invoice.subtotalMinor,
        totalMinor: invoice.totalMinor,
        paidAmountMinor: invoice.paidAmountMinor,
        balanceDueMinor: invoice.balanceDueMinor,
        client: invoice.client,
        project: invoice.project,
        lines: invoice.lines.map((line) => ({
          lineNumber: line.lineNumber,
          description: line.description,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
          lineTotalMinor: line.lineTotalMinor,
          serviceItem: line.serviceItem,
        })),
      },
    }),
  );

  const attachment = await uploadFileAttachment({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    request: input.request,
    entityType: FileAttachmentEntityType.INVOICE,
    entityId: invoice.id,
    storagePathSegments: ['invoices', String(invoice.invoiceYear)],
    file: {
      fieldname: 'file',
      originalname: originalFilename,
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: pdfBuffer.length,
      destination: '',
      filename: originalFilename,
      path: '',
      buffer: pdfBuffer,
      stream: null as never,
    } as Express.Multer.File,
  });

  return attachment;
}
