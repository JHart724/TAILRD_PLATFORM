import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Types for speakeasy/qrcode (may need installation)
interface TOTPSecret {
  ascii: string;
  hex: string;
  base32: string;
  otpauth_url: string;
}

// Use dynamic imports for optional dependencies
let speakeasy: any;
let QRCode: any;

async function loadDeps() {
  try {
    speakeasy = require('speakeasy');
    QRCode = require('qrcode');
  } catch {
    console.warn('speakeasy/qrcode not installed. MFA will use fallback mode.');
  }
}
loadDeps();

// Import prisma singleton
// Note: UserMFA, UserSession, IPAllowlist models require `npx prisma generate` after schema update
import prismaClient from '../lib/prisma';
const prisma = prismaClient as any; // Cast until prisma generate runs with new schema models

export class MFAService {

  async generateSecret(userId: string, email: string, hospitalName: string) {
    if (!speakeasy) throw new Error('MFA dependencies not installed');

    const secret: TOTPSecret = speakeasy.generateSecret({
      name: `TAILRD Heart (${email})`,
      issuer: `TAILRD Heart - ${hospitalName}`,
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret (not yet enabled)
    await prisma.userMFA.upsert({
      where: { userId },
      update: { secret: secret.base32, enabled: false },
      create: { userId, secret: secret.base32, enabled: false, backupCodes: [] },
    });

    return {
      secret: secret.base32,
      qrCodeUrl,
      manualEntryKey: secret.base32,
    };
  }

  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    if (!speakeasy) return false;

    const mfa = await prisma.userMFA.findUnique({ where: { userId } });
    if (!mfa) return false;

    const valid = speakeasy.totp.verify({
      secret: mfa.secret,
      encoding: 'base32',
      token,
      window: 1, // +/-30 seconds for clock drift
    });

    if (valid) {
      await prisma.userMFA.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });
    }

    return valid;
  }

  async enableMFA(userId: string, verificationToken: string) {
    const valid = await this.verifyTOTP(userId, verificationToken);
    if (!valid) throw new Error('Invalid verification code');

    // Generate 8 backup codes
    const backupCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10-char alphanumeric
      backupCodes.push(code);
      hashedCodes.push(await bcrypt.hash(code, 10));
    }

    await prisma.userMFA.update({
      where: { userId },
      data: {
        enabled: true,
        enabledAt: new Date(),
        backupCodes: hashedCodes,
        backupCodesUsed: 0,
      },
    });

    return { backupCodes }; // Return plaintext ONCE
  }

  async disableMFA(userId: string, token?: string, adminOverride?: boolean) {
    if (!adminOverride) {
      if (!token) throw new Error('TOTP token required');
      const valid = await this.verifyTOTP(userId, token);
      if (!valid) throw new Error('Invalid verification code');
    }

    await prisma.userMFA.update({
      where: { userId },
      data: { enabled: false, backupCodes: [], backupCodesUsed: 0 },
    });
  }

  async verifyBackupCode(userId: string, code: string): Promise<{ valid: boolean; codesRemaining: number }> {
    const mfa = await prisma.userMFA.findUnique({ where: { userId } });
    if (!mfa) return { valid: false, codesRemaining: 0 };

    for (let i = 0; i < mfa.backupCodes.length; i++) {
      if (mfa.backupCodes[i] && await bcrypt.compare(code, mfa.backupCodes[i])) {
        // Mark code as used
        const updatedCodes = [...mfa.backupCodes];
        updatedCodes[i] = ''; // Empty = used

        await prisma.userMFA.update({
          where: { userId },
          data: {
            backupCodes: updatedCodes,
            backupCodesUsed: mfa.backupCodesUsed + 1,
          },
        });

        const remaining = updatedCodes.filter(c => c !== '').length;
        return { valid: true, codesRemaining: remaining };
      }
    }

    return { valid: false, codesRemaining: mfa.backupCodes.filter((c: string) => c !== '').length };
  }

  async getMFAStatus(userId: string) {
    const mfa = await prisma.userMFA.findUnique({ where: { userId } });
    if (!mfa) return { enabled: false, enabledAt: null, backupCodesRemaining: 0, lastUsedAt: null };

    return {
      enabled: mfa.enabled,
      enabledAt: mfa.enabledAt,
      backupCodesRemaining: mfa.backupCodes.filter((c: string) => c !== '').length,
      lastUsedAt: mfa.lastUsedAt,
    };
  }

  async checkIPAllowlist(userId: string, ip: string): Promise<boolean> {
    const entries = await prisma.iPAllowlist.findMany({ where: { userId } });
    if (entries.length === 0) return true; // No allowlist = allow all (first login)

    const matched = entries.some((e: { ipAddress: string }) => {
      if (e.ipAddress.includes('/')) {
        // CIDR matching (simplified -- check prefix)
        const [subnet] = e.ipAddress.split('/');
        return ip.startsWith(subnet.split('.').slice(0, 3).join('.'));
      }
      return e.ipAddress === ip;
    });

    if (matched) {
      // Update lastUsedAt for the matched entry
      const entry = entries.find((e: { ipAddress: string }) => e.ipAddress === ip);
      if (entry) {
        await prisma.iPAllowlist.update({
          where: { id: entry.id },
          data: { lastUsedAt: new Date() },
        });
      }
    }

    return matched;
  }
}

export const mfaService = new MFAService();
