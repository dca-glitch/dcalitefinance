import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { toJsonSafe } from '../utils/json';
import { getIssuerProfile, upsertIssuerProfile } from '../services/issuer-profile.service';

const optionalText = (maxLength: number) => z.string().trim().min(1).max(maxLength).nullable().optional();

const issuerProfileSchema = z.object({
  issuerDisplayName: z.string().trim().min(1).max(160),
  issuerLegalName: optionalText(200),
  addressLine1: optionalText(160),
  addressLine2: optionalText(160),
  city: optionalText(120),
  state: optionalText(120),
  postalCode: optionalText(40),
  country: optionalText(120),
  email: z.string().trim().email().nullable().optional(),
  phone: optionalText(40),
  website: z.string().trim().url().nullable().optional(),
  taxId: optionalText(80),
  companyRegistrationNumber: optionalText(80),
  currencyCode: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => /^[A-Z]{3}$/.test(value), { message: 'Currency code must be 3 uppercase letters' }),
  defaultInvoiceTerms: z.string().trim().min(1).max(5000).nullable().optional(),
  defaultPaymentInstructions: z.string().trim().min(1).max(5000).nullable().optional(),
  bankAccountName: optionalText(160),
  bankName: optionalText(160),
  bankAccountNumber: optionalText(120),
  bankSwift: optionalText(40),
  invoiceFooter: z.string().trim().min(1).max(5000).nullable().optional(),
});

function requireAuthAndTenant(req: Request): { userId: string; tenantId: string } {
  if (!req.auth) {
    throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED');
  }

  if (!req.tenant) {
    throw new AppError('Tenant context required', 400, 'TENANT_CONTEXT_REQUIRED');
  }

  return {
    userId: req.auth.userId,
    tenantId: req.tenant.id,
  };
}

export async function getIssuerProfileHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const issuerProfile = await getIssuerProfile(context.tenantId);

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        issuerProfile,
      },
    }),
  );
}

export async function upsertIssuerProfileHandler(req: Request, res: Response): Promise<void> {
  const context = requireAuthAndTenant(req);
  const parsed = issuerProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Invalid issuer profile payload', 400, 'INVALID_ISSUER_PROFILE_PAYLOAD');
  }

  const issuerProfile = await upsertIssuerProfile({
    tenantId: context.tenantId,
    actorUserId: context.userId,
    request: req,
    issuerDisplayName: parsed.data.issuerDisplayName,
    issuerLegalName: parsed.data.issuerLegalName ?? undefined,
    addressLine1: parsed.data.addressLine1 ?? undefined,
    addressLine2: parsed.data.addressLine2 ?? undefined,
    city: parsed.data.city ?? undefined,
    state: parsed.data.state ?? undefined,
    postalCode: parsed.data.postalCode ?? undefined,
    country: parsed.data.country ?? undefined,
    email: parsed.data.email ?? undefined,
    phone: parsed.data.phone ?? undefined,
    website: parsed.data.website ?? undefined,
    taxId: parsed.data.taxId ?? undefined,
    companyRegistrationNumber: parsed.data.companyRegistrationNumber ?? undefined,
    currencyCode: parsed.data.currencyCode,
    defaultInvoiceTerms: parsed.data.defaultInvoiceTerms ?? undefined,
    defaultPaymentInstructions: parsed.data.defaultPaymentInstructions ?? undefined,
    bankAccountName: parsed.data.bankAccountName ?? undefined,
    bankName: parsed.data.bankName ?? undefined,
    bankAccountNumber: parsed.data.bankAccountNumber ?? undefined,
    bankSwift: parsed.data.bankSwift ?? undefined,
    invoiceFooter: parsed.data.invoiceFooter ?? undefined,
  });

  res.status(200).json(
    toJsonSafe({
      success: true,
      data: {
        issuerProfile,
      },
    }),
  );
}
