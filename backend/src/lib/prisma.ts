import { PrismaClient } from '@prisma/client';
import { applyPHIEncryption } from '../middleware/phiEncryption';

// Shared Prisma client — single instance for the entire backend.
// Avoids connection pool exhaustion from multiple `new PrismaClient()` calls.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Wire PHI field-level encryption (AES-256-GCM) on Patient model.
// Passthrough when PHI_ENCRYPTION_KEY is not set (dev/demo).
applyPHIEncryption(prisma);

export default prisma;
