/**
 * KMS Encryption Service
 *
 * Wraps AWS KMS for PHI encryption key management.
 * In production, PHI_ENCRYPTION_KEY should come from KMS rather than
 * a static environment variable — this service provides that bridge.
 *
 * Features:
 *   - Generate data keys for envelope encryption
 *   - Encrypt/decrypt PHI fields via KMS
 *   - Key rotation awareness (auto-rotated annually by CloudFormation)
 *   - Falls back to local PHI_ENCRYPTION_KEY in dev/demo mode
 */

import {
  KMSClient,
  GenerateDataKeyCommand,
  EncryptCommand,
  DecryptCommand,
  DescribeKeyCommand,
} from '@aws-sdk/client-kms';
import crypto from 'crypto';

// ── Configuration ───────────────────────────────────────────────────────────

const isDemoMode = process.env.DEMO_MODE === 'true';
const isProduction = process.env.NODE_ENV === 'production';

const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  }),
});

// KMS key alias OR ARN for PHI encryption. AWS SDK accepts either format
// natively in `KeyId` parameter (arn:aws:kms:... or alias/foo).
// Default alias remains for backwards compatibility with pre-AUDIT-016-PR-2 callers.
const PHI_KEY_ALIAS = process.env.AWS_KMS_PHI_KEY_ALIAS || 'alias/tailrd-production-phi';

// Local fallback key (dev/demo mode only)
const LOCAL_KEY = process.env.PHI_ENCRYPTION_KEY || '';

// ── Types ───────────────────────────────────────────────────────────────────

interface EnvelopeEncryptResult {
  ciphertext: string;       // Base64-encoded encrypted data
  encryptedDataKey: string; // Base64-encoded encrypted data key (store alongside ciphertext)
  iv: string;               // Base64-encoded IV
  authTag: string;          // Base64-encoded GCM auth tag
}

/**
 * EncryptionContext shape passed to AWS KMS GenerateDataKey + Decrypt.
 * Per AUDIT-016 PR 2 D2: per-record context provides HIPAA audit-trail
 * anchor via CloudTrail kms:Decrypt event payload. KMS verifies context
 * matches at decrypt time (mismatch → AccessDeniedException) — tamper-
 * evidence + cross-field decrypt prevention.
 *
 * Required fields: service, purpose. Optional: model, field (per-record).
 * AWS KMS EncryptionContext is `Record<string, string>`; we project the
 * typed shape into that flat record at the boundary.
 */
export interface KmsEncryptionContext {
  readonly service: string;
  readonly purpose: string;
  readonly model?: string;
  readonly field?: string;
}

const DEFAULT_KMS_CONTEXT: KmsEncryptionContext = {
  service: 'tailrd-backend',
  purpose: 'phi-encryption',
};

const DEFAULT_KMS_FIELD_CONTEXT: KmsEncryptionContext = {
  service: 'tailrd-backend',
  purpose: 'phi-field',
};

/** Project structured context into AWS SDK's flat `Record<string, string>`. */
function toAwsEncryptionContext(ctx: KmsEncryptionContext): Record<string, string> {
  const out: Record<string, string> = {
    service: ctx.service,
    purpose: ctx.purpose,
  };
  if (ctx.model) out.model = ctx.model;
  if (ctx.field) out.field = ctx.field;
  return out;
}

interface KeyInfo {
  keyId: string;
  arn: string;
  creationDate?: Date;
  enabled: boolean;
  keyRotationEnabled: boolean;
  description: string;
}

// ── Envelope Encryption (recommended for PHI fields) ────────────────────────

/**
 * Encrypt data using envelope encryption:
 * 1. Request a data key from KMS
 * 2. Use the plaintext data key to AES-256-GCM encrypt the data locally
 * 3. Store the KMS-encrypted data key alongside the ciphertext
 * 4. Plaintext data key is never stored
 *
 * This minimizes KMS API calls while maintaining key management in HSM.
 */
export async function envelopeEncrypt(
  plaintext: string,
  context: KmsEncryptionContext = DEFAULT_KMS_CONTEXT,
): Promise<EnvelopeEncryptResult> {
  if (isDemoMode || !isProduction) {
    return localEncrypt(plaintext);
  }

  // Step 1: Get a data key from KMS with per-record EncryptionContext (AUDIT-016 PR 2 D2)
  const dataKeyCommand = new GenerateDataKeyCommand({
    KeyId: PHI_KEY_ALIAS,
    KeySpec: 'AES_256',
    EncryptionContext: toAwsEncryptionContext(context),
  });

  const dataKeyResult = await kmsClient.send(dataKeyCommand);

  if (!dataKeyResult.Plaintext || !dataKeyResult.CiphertextBlob) {
    throw new Error('KMS GenerateDataKey failed — no key material returned');
  }

  // Step 2: Use plaintext data key to encrypt locally
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(dataKeyResult.Plaintext),
    iv,
  );

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  // Step 3: Return encrypted data + encrypted data key
  return {
    ciphertext: encrypted,
    encryptedDataKey: Buffer.from(dataKeyResult.CiphertextBlob).toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt data that was encrypted with envelope encryption:
 * 1. Send the encrypted data key to KMS for decryption
 * 2. Use the plaintext data key to AES-256-GCM decrypt locally
 */
export async function envelopeDecrypt(
  encrypted: EnvelopeEncryptResult,
  context: KmsEncryptionContext = DEFAULT_KMS_CONTEXT,
): Promise<string> {
  if (isDemoMode || !isProduction) {
    return localDecrypt(encrypted);
  }

  // Step 1: Decrypt the data key via KMS with the SAME per-record context
  // supplied at encrypt time (KMS rejects on mismatch — tamper evidence).
  const decryptKeyCommand = new DecryptCommand({
    CiphertextBlob: Buffer.from(encrypted.encryptedDataKey, 'base64'),
    EncryptionContext: toAwsEncryptionContext(context),
  });

  const decryptKeyResult = await kmsClient.send(decryptKeyCommand);

  if (!decryptKeyResult.Plaintext) {
    throw new Error('KMS Decrypt failed — no plaintext key returned');
  }

  // Step 2: Use plaintext data key to decrypt locally
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(decryptKeyResult.Plaintext),
    Buffer.from(encrypted.iv, 'base64'),
  );

  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));

  let decrypted = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ── Direct KMS Encrypt/Decrypt (for small values like SSN, MRN) ─────────────

/**
 * Encrypt a short value directly via KMS (max 4KB).
 * Use for individual PHI fields like SSN, MRN.
 * For larger data, use envelope encryption.
 */
export async function kmsEncrypt(plaintext: string): Promise<string> {
  if (isDemoMode || !isProduction) {
    // Local fallback
    const result = localEncrypt(plaintext);
    return JSON.stringify(result);
  }

  if (Buffer.byteLength(plaintext, 'utf8') > 4096) {
    throw new Error('Direct KMS encryption limited to 4KB. Use envelopeEncrypt for larger data.');
  }

  const command = new EncryptCommand({
    KeyId: PHI_KEY_ALIAS,
    Plaintext: Buffer.from(plaintext, 'utf8'),
    EncryptionContext: {
      service: 'tailrd-backend',
      purpose: 'phi-field',
    },
  });

  const result = await kmsClient.send(command);
  if (!result.CiphertextBlob) {
    throw new Error('KMS Encrypt failed');
  }

  return Buffer.from(result.CiphertextBlob).toString('base64');
}

/**
 * Decrypt a value that was encrypted with kmsEncrypt.
 */
export async function kmsDecrypt(ciphertext: string): Promise<string> {
  if (isDemoMode || !isProduction) {
    try {
      const parsed = JSON.parse(ciphertext);
      return localDecrypt(parsed);
    } catch {
      return ciphertext; // Passthrough if not encrypted
    }
  }

  const command = new DecryptCommand({
    CiphertextBlob: Buffer.from(ciphertext, 'base64'),
    EncryptionContext: {
      service: 'tailrd-backend',
      purpose: 'phi-field',
    },
  });

  const result = await kmsClient.send(command);
  if (!result.Plaintext) {
    throw new Error('KMS Decrypt failed');
  }

  return Buffer.from(result.Plaintext).toString('utf8');
}

// ── Key Information ─────────────────────────────────────────────────────────

/**
 * Get information about the PHI encryption key (for admin dashboard).
 */
export async function getKeyInfo(): Promise<KeyInfo> {
  if (isDemoMode) {
    return {
      keyId: 'demo-key',
      arn: 'arn:aws:kms:us-east-1:000000000000:key/demo-key',
      creationDate: new Date('2026-01-01'),
      enabled: true,
      keyRotationEnabled: true,
      description: 'Demo mode — local encryption key',
    };
  }

  const command = new DescribeKeyCommand({
    KeyId: PHI_KEY_ALIAS,
  });

  const result = await kmsClient.send(command);
  const keyMeta = result.KeyMetadata;

  if (!keyMeta) {
    throw new Error('KMS DescribeKey returned no metadata');
  }

  return {
    keyId: keyMeta.KeyId || '',
    arn: keyMeta.Arn || '',
    creationDate: keyMeta.CreationDate,
    enabled: keyMeta.Enabled || false,
    keyRotationEnabled: keyMeta.KeyManager === 'CUSTOMER', // Customer-managed keys support rotation
    description: keyMeta.Description || '',
  };
}

// ── Local Encryption (dev/demo fallback) ────────────────────────────────────

function localEncrypt(plaintext: string): EnvelopeEncryptResult {
  const key = LOCAL_KEY
    ? Buffer.from(LOCAL_KEY, 'hex')
    : crypto.randomBytes(32);

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    encryptedDataKey: key.toString('base64'), // In local mode, "encrypted" key is just the key itself
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

function localDecrypt(encrypted: EnvelopeEncryptResult): string {
  const key = Buffer.from(encrypted.encryptedDataKey, 'base64');
  const iv = Buffer.from(encrypted.iv, 'base64');
  const authTag = Buffer.from(encrypted.authTag, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ── Exports ─────────────────────────────────────────────────────────────────

export const kmsService = {
  envelopeEncrypt,
  envelopeDecrypt,
  kmsEncrypt,
  kmsDecrypt,
  getKeyInfo,
};

export default kmsService;
