import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { AuditAction, AuditActorType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../errors/AppError';
import { writeAuditLog } from './audit.service';

export interface SafeIssuerProfileResponse {
  id: string;
  tenantId: string;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IssuerProfileUpsertInput {
  tenantId: string;
  actorUserId: string;
  request: Request;
  issuerDisplayName: string;
  issuerLegalName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  taxId?: string | null;
  companyRegistrationNumber?: string | null;
  currencyCode: string;
  defaultInvoiceTerms?: string | null;
  defaultPaymentInstructions?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankSwift?: string | null;
  invoiceFooter?: string | null;
}

const issuerProfileSelect = {
  id: true,
  tenantId: true,
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
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TenantIssuerProfileSelect;

function normalizeOptionalText(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function currencyLockedError(): AppError {
  return new AppError('Currency cannot be changed after financial records exist', 400, 'CURRENCY_LOCKED_AFTER_FINANCIAL_RECORDS');
}

function currencyRequiredError(): AppError {
  return new AppError('Currency code is required', 400, 'CURRENCY_CODE_REQUIRED');
}

function mapIssuerProfile(profile: {
  id: string;
  tenantId: string;
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
  createdAt: Date;
  updatedAt: Date;
}): SafeIssuerProfileResponse {
  return profile;
}

async function financialRecordCount(tenantId: string): Promise<number> {
  const [invoices, payments, bills, recurringInvoices] = await Promise.all([
    prisma.invoice.count({ where: { tenantId } }),
    prisma.payment.count({ where: { tenantId } }),
    prisma.bill.count({ where: { tenantId } }),
    prisma.recurringInvoice.count({ where: { tenantId } }),
  ]);

  return invoices + payments + bills + recurringInvoices;
}

export async function getIssuerProfile(tenantId: string): Promise<SafeIssuerProfileResponse | null> {
  const profile = await prisma.tenantIssuerProfile.findUnique({
    where: { tenantId },
    select: issuerProfileSelect,
  });

  return profile ? mapIssuerProfile(profile) : null;
}

export async function upsertIssuerProfile(input: IssuerProfileUpsertInput): Promise<SafeIssuerProfileResponse> {
  const currencyCode = input.currencyCode.trim().toUpperCase();
  if (currencyCode.length !== 3) {
    throw currencyRequiredError();
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.tenantIssuerProfile.findUnique({
      where: { tenantId: input.tenantId },
      select: {
        id: true,
        currencyCode: true,
      },
    });

    if (!existing) {
      const created = await tx.tenantIssuerProfile.create({
        data: {
          tenantId: input.tenantId,
          issuerDisplayName: input.issuerDisplayName.trim(),
          issuerLegalName: normalizeOptionalText(input.issuerLegalName),
          addressLine1: normalizeOptionalText(input.addressLine1),
          addressLine2: normalizeOptionalText(input.addressLine2),
          city: normalizeOptionalText(input.city),
          state: normalizeOptionalText(input.state),
          postalCode: normalizeOptionalText(input.postalCode),
          country: normalizeOptionalText(input.country),
          email: normalizeOptionalText(input.email),
          phone: normalizeOptionalText(input.phone),
          website: normalizeOptionalText(input.website),
          taxId: normalizeOptionalText(input.taxId),
          companyRegistrationNumber: normalizeOptionalText(input.companyRegistrationNumber),
          currencyCode,
          defaultInvoiceTerms: normalizeOptionalText(input.defaultInvoiceTerms),
          defaultPaymentInstructions: normalizeOptionalText(input.defaultPaymentInstructions),
          bankAccountName: normalizeOptionalText(input.bankAccountName),
          bankName: normalizeOptionalText(input.bankName),
          bankAccountNumber: normalizeOptionalText(input.bankAccountNumber),
          bankSwift: normalizeOptionalText(input.bankSwift),
          invoiceFooter: normalizeOptionalText(input.invoiceFooter),
        },
        select: issuerProfileSelect,
      });

      return { profile: created, action: AuditAction.CREATE };
    }

    if (existing.currencyCode !== currencyCode) {
      const recordCount = await financialRecordCount(input.tenantId);
      if (recordCount > 0) {
        throw currencyLockedError();
      }
    }

    const updated = await tx.tenantIssuerProfile.upsert({
      where: { tenantId: input.tenantId },
      create: {
        tenantId: input.tenantId,
        issuerDisplayName: input.issuerDisplayName.trim(),
        issuerLegalName: normalizeOptionalText(input.issuerLegalName),
        addressLine1: normalizeOptionalText(input.addressLine1),
        addressLine2: normalizeOptionalText(input.addressLine2),
        city: normalizeOptionalText(input.city),
        state: normalizeOptionalText(input.state),
        postalCode: normalizeOptionalText(input.postalCode),
        country: normalizeOptionalText(input.country),
        email: normalizeOptionalText(input.email),
        phone: normalizeOptionalText(input.phone),
        website: normalizeOptionalText(input.website),
        taxId: normalizeOptionalText(input.taxId),
        companyRegistrationNumber: normalizeOptionalText(input.companyRegistrationNumber),
        currencyCode,
        defaultInvoiceTerms: normalizeOptionalText(input.defaultInvoiceTerms),
        defaultPaymentInstructions: normalizeOptionalText(input.defaultPaymentInstructions),
        bankAccountName: normalizeOptionalText(input.bankAccountName),
        bankName: normalizeOptionalText(input.bankName),
        bankAccountNumber: normalizeOptionalText(input.bankAccountNumber),
        bankSwift: normalizeOptionalText(input.bankSwift),
        invoiceFooter: normalizeOptionalText(input.invoiceFooter),
      },
      update: {
        issuerDisplayName: input.issuerDisplayName.trim(),
        issuerLegalName: normalizeOptionalText(input.issuerLegalName),
        addressLine1: normalizeOptionalText(input.addressLine1),
        addressLine2: normalizeOptionalText(input.addressLine2),
        city: normalizeOptionalText(input.city),
        state: normalizeOptionalText(input.state),
        postalCode: normalizeOptionalText(input.postalCode),
        country: normalizeOptionalText(input.country),
        email: normalizeOptionalText(input.email),
        phone: normalizeOptionalText(input.phone),
        website: normalizeOptionalText(input.website),
        taxId: normalizeOptionalText(input.taxId),
        companyRegistrationNumber: normalizeOptionalText(input.companyRegistrationNumber),
        currencyCode,
        defaultInvoiceTerms: normalizeOptionalText(input.defaultInvoiceTerms),
        defaultPaymentInstructions: normalizeOptionalText(input.defaultPaymentInstructions),
        bankAccountName: normalizeOptionalText(input.bankAccountName),
        bankName: normalizeOptionalText(input.bankName),
        bankAccountNumber: normalizeOptionalText(input.bankAccountNumber),
        bankSwift: normalizeOptionalText(input.bankSwift),
        invoiceFooter: normalizeOptionalText(input.invoiceFooter),
      },
      select: issuerProfileSelect,
    });

    return { profile: updated, action: AuditAction.UPDATE };
  });

  await writeAuditLog({
    actorType: AuditActorType.USER,
    action: result.action,
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    request: input.request,
    entityType: 'TenantIssuerProfile',
    entityId: result.profile.id,
    metadata: {
      issuerDisplayName: result.profile.issuerDisplayName,
      currencyCode: result.profile.currencyCode,
    } satisfies Prisma.InputJsonValue,
  });

  return mapIssuerProfile(result.profile);
}
