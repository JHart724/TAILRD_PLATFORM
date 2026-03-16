import crypto from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';

const ENCRYPTION_KEY = process.env.PHI_ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';
const isDemoMode = process.env.DEMO_MODE === 'true';
const isProduction = process.env.NODE_ENV === 'production';

// PHI fields that must be encrypted at rest per HIPAA 164.312(a)(2)(iv)
const PHI_FIELD_MAP: Record<string, string[]> = {
  Patient: [
    'firstName',
    'lastName',
    'dateOfBirth',
    'phone',
    'email',
    'mrn',
    'street',
    'city',
    'state',
    'zipCode',
  ],
};

function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    if (isProduction) {
      throw new Error('FATAL: PHI_ENCRYPTION_KEY is required in production. Cannot store PHI unencrypted.');
    }
    return text; // Passthrough only in dev/demo mode
  }
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  if (!ENCRYPTION_KEY) {
    if (isProduction) {
      throw new Error('FATAL: PHI_ENCRYPTION_KEY is required in production. Cannot read PHI without key.');
    }
    return encryptedText;
  }
  if (!encryptedText.startsWith('enc:')) return encryptedText; // Not encrypted
  try {
    const [, ivHex, authTagHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encrypted) return encryptedText;
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText; // Return as-is if decryption fails (might be plaintext)
  }
}

function encryptFields(data: Record<string, any>, fields: string[]): void {
  for (const field of fields) {
    if (data[field] && typeof data[field] === 'string') {
      data[field] = encrypt(data[field]);
    }
  }
}

function decryptRecord(record: Record<string, any>, fields: string[]): Record<string, any> {
  for (const field of fields) {
    if (record[field] && typeof record[field] === 'string') {
      record[field] = decrypt(record[field]);
    }
  }
  return record;
}

export function applyPHIEncryption(prisma: PrismaClient): void {
  prisma.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    const model = params.model as string | undefined;
    if (!model || !PHI_FIELD_MAP[model]) {
      return next(params);
    }

    const fields = PHI_FIELD_MAP[model];

    // Encrypt on write
    if (['create', 'update', 'upsert'].includes(params.action)) {
      const data = params.args?.data;
      if (data) {
        encryptFields(data, fields);
      }
      // Handle upsert's create/update separately
      if (params.action === 'upsert') {
        if (params.args?.create) encryptFields(params.args.create, fields);
        if (params.args?.update) encryptFields(params.args.update, fields);
      }
    }

    if (params.action === 'createMany' && params.args?.data) {
      const rows = Array.isArray(params.args.data) ? params.args.data : [params.args.data];
      for (const row of rows) {
        encryptFields(row, fields);
      }
    }

    const result = await next(params);

    // Decrypt on read
    if (result) {
      if (Array.isArray(result)) {
        return result.map((r) => (typeof r === 'object' && r !== null ? decryptRecord(r, fields) : r));
      }
      if (typeof result === 'object' && result !== null) {
        return decryptRecord(result, fields);
      }
    }

    return result;
  });
}

// Generate a new 256-bit encryption key (run once, store in Secrets Manager)
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
