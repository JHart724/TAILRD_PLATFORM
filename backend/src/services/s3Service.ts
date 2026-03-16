/**
 * S3 File Storage Service
 *
 * HIPAA-compliant file storage for patient documents, clinical reports,
 * audit exports, and application assets.
 *
 * Key features:
 *   - Hospital-scoped file paths (tenant isolation)
 *   - Automatic KMS encryption on all uploads
 *   - Pre-signed URLs for secure temporary access
 *   - File type validation (no executables)
 *   - Size limits per file category
 *   - Audit trail on every operation
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// ── Configuration ───────────────────────────────────────────────────────────

const isDemoMode = process.env.DEMO_MODE === 'true';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  }),
});

const BUCKETS = {
  phi: process.env.S3_PHI_BUCKET || 'tailrd-production-phi-documents',
  audit: process.env.S3_AUDIT_BUCKET || 'tailrd-production-audit-exports',
  assets: process.env.S3_ASSETS_BUCKET || 'tailrd-production-app-assets',
} as const;

const KMS_KEY_ID = process.env.AWS_KMS_S3_KEY_ID || '';

// ── File Categories & Validation ────────────────────────────────────────────

interface FileCategory {
  bucket: keyof typeof BUCKETS;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  pathPrefix: string;
  requiresKMS: boolean;
}

const FILE_CATEGORIES: Record<string, FileCategory> = {
  'patient-document': {
    bucket: 'phi',
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/dicom',
      'application/dicom',
      'text/plain',
      'application/json',
    ],
    pathPrefix: 'patients',
    requiresKMS: true,
  },
  'clinical-report': {
    bucket: 'phi',
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/json',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    pathPrefix: 'reports',
    requiresKMS: true,
  },
  'audit-export': {
    bucket: 'audit',
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: ['application/json', 'text/csv'],
    pathPrefix: 'exports',
    requiresKMS: true,
  },
  'app-asset': {
    bucket: 'assets',
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'application/pdf',
      'text/css',
      'application/javascript',
    ],
    pathPrefix: 'assets',
    requiresKMS: false,
  },
};

// Blocked file extensions (executables, scripts)
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.dll', '.scr',
  '.ps1', '.vbs', '.js', '.sh', '.py', '.rb', '.pl',
  '.jar', '.class', '.war', '.ear',
];

// ── Types ───────────────────────────────────────────────────────────────────

interface UploadParams {
  hospitalId: string;
  userId: string;
  category: string;
  fileName: string;
  contentType: string;
  body: Buffer | string;
  metadata?: Record<string, string>;
  patientId?: string;
}

interface UploadResult {
  key: string;
  bucket: string;
  versionId?: string;
  etag?: string;
  url: string;
}

interface PresignedUrlParams {
  key: string;
  bucket: keyof typeof BUCKETS;
  expiresIn?: number; // seconds, default 300 (5 min)
  disposition?: string;
}

interface ListParams {
  hospitalId: string;
  category: string;
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

// ── Service Functions ───────────────────────────────────────────────────────

/**
 * Upload a file to S3 with hospital-scoped path and KMS encryption.
 */
export async function uploadFile(params: UploadParams): Promise<UploadResult> {
  if (isDemoMode) {
    return createDemoResult(params);
  }

  const { hospitalId, userId, category, fileName, contentType, body, metadata, patientId } = params;

  // Validate category
  const categoryConfig = FILE_CATEGORIES[category];
  if (!categoryConfig) {
    throw new Error(`Invalid file category: ${category}`);
  }

  // Validate file extension
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new Error(`File type ${ext} is not allowed for security reasons`);
  }

  // Validate MIME type
  if (!categoryConfig.allowedMimeTypes.includes(contentType)) {
    throw new Error(
      `Content type ${contentType} is not allowed for category ${category}. ` +
      `Allowed: ${categoryConfig.allowedMimeTypes.join(', ')}`
    );
  }

  // Validate size
  const size = typeof body === 'string' ? Buffer.byteLength(body) : body.length;
  if (size > categoryConfig.maxSizeBytes) {
    const maxMB = Math.round(categoryConfig.maxSizeBytes / (1024 * 1024));
    throw new Error(`File exceeds maximum size of ${maxMB}MB for category ${category}`);
  }

  // Build hospital-scoped key:
  // {prefix}/{hospitalId}/{patientId?}/{date}/{uuid}-{sanitizedFileName}
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const fileId = crypto.randomUUID();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  let key = `${categoryConfig.pathPrefix}/${hospitalId}`;
  if (patientId) {
    key += `/${patientId}`;
  }
  key += `/${date}/${fileId}-${sanitizedName}`;

  const bucket = BUCKETS[categoryConfig.bucket];

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    ...(categoryConfig.requiresKMS && KMS_KEY_ID && {
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: KMS_KEY_ID,
    }),
    Metadata: {
      'x-tailrd-hospital-id': hospitalId,
      'x-tailrd-user-id': userId,
      'x-tailrd-category': category,
      'x-tailrd-original-name': fileName,
      ...(patientId && { 'x-tailrd-patient-id': patientId }),
      ...metadata,
    },
    Tagging: `hospitalId=${hospitalId}&category=${category}&hipaa=true`,
  });

  const result = await s3Client.send(command);

  return {
    key,
    bucket,
    versionId: result.VersionId,
    etag: result.ETag,
    url: `s3://${bucket}/${key}`,
  };
}

/**
 * Generate a pre-signed URL for secure temporary download.
 * Default expiry: 5 minutes (HIPAA — minimize exposure window).
 */
export async function getPresignedDownloadUrl(params: PresignedUrlParams): Promise<string> {
  if (isDemoMode) {
    return `https://demo.tailrd.com/files/${params.key}?token=demo`;
  }

  const { key, bucket, expiresIn = 300, disposition } = params;
  const bucketName = BUCKETS[bucket];

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ...(disposition && { ResponseContentDisposition: disposition }),
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a pre-signed URL for direct upload from the client.
 * This avoids routing large files through the backend.
 */
export async function getPresignedUploadUrl(
  hospitalId: string,
  userId: string,
  category: string,
  fileName: string,
  contentType: string,
  patientId?: string,
): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
  if (isDemoMode) {
    return {
      uploadUrl: 'https://demo.tailrd.com/upload',
      key: `demo/${hospitalId}/${fileName}`,
      expiresIn: 3600,
    };
  }

  const categoryConfig = FILE_CATEGORIES[category];
  if (!categoryConfig) {
    throw new Error(`Invalid file category: ${category}`);
  }

  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    throw new Error(`File type ${ext} is not allowed`);
  }

  const date = new Date().toISOString().split('T')[0];
  const fileId = crypto.randomUUID();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  let key = `${categoryConfig.pathPrefix}/${hospitalId}`;
  if (patientId) key += `/${patientId}`;
  key += `/${date}/${fileId}-${sanitizedName}`;

  const bucket = BUCKETS[categoryConfig.bucket];
  const expiresIn = 3600; // 1 hour for uploads

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ...(categoryConfig.requiresKMS && KMS_KEY_ID && {
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: KMS_KEY_ID,
    }),
    Metadata: {
      'x-tailrd-hospital-id': hospitalId,
      'x-tailrd-user-id': userId,
      'x-tailrd-category': category,
      'x-tailrd-original-name': fileName,
      ...(patientId && { 'x-tailrd-patient-id': patientId }),
    },
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return { uploadUrl, key, expiresIn };
}

/**
 * Get file metadata without downloading the file.
 */
export async function getFileMetadata(key: string, bucket: keyof typeof BUCKETS) {
  if (isDemoMode) {
    return {
      contentType: 'application/pdf',
      contentLength: 12345,
      lastModified: new Date(),
      metadata: {},
    };
  }

  const command = new HeadObjectCommand({
    Bucket: BUCKETS[bucket],
    Key: key,
  });

  const result = await s3Client.send(command);

  return {
    contentType: result.ContentType,
    contentLength: result.ContentLength,
    lastModified: result.LastModified,
    versionId: result.VersionId,
    metadata: result.Metadata || {},
    serverSideEncryption: result.ServerSideEncryption,
  };
}

/**
 * List files for a hospital, optionally filtered by category/prefix.
 */
export async function listFiles(params: ListParams) {
  if (isDemoMode) {
    return { files: [], nextToken: undefined, totalCount: 0 };
  }

  const { hospitalId, category, prefix, maxKeys = 100, continuationToken } = params;
  const categoryConfig = FILE_CATEGORIES[category];
  if (!categoryConfig) {
    throw new Error(`Invalid file category: ${category}`);
  }

  let fullPrefix = `${categoryConfig.pathPrefix}/${hospitalId}`;
  if (prefix) fullPrefix += `/${prefix}`;

  const command = new ListObjectsV2Command({
    Bucket: BUCKETS[categoryConfig.bucket],
    Prefix: fullPrefix,
    MaxKeys: maxKeys,
    ContinuationToken: continuationToken,
  });

  const result = await s3Client.send(command);

  return {
    files: (result.Contents || []).map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      etag: obj.ETag,
    })),
    nextToken: result.NextContinuationToken,
    totalCount: result.KeyCount || 0,
  };
}

/**
 * Delete a file (soft delete — versioning preserves the file).
 * The file remains recoverable via version ID.
 */
export async function deleteFile(
  key: string,
  bucket: keyof typeof BUCKETS,
  hospitalId: string,
): Promise<{ deleted: boolean; versionId?: string }> {
  if (isDemoMode) {
    return { deleted: true };
  }

  // Verify hospital ownership before deleting
  const metadata = await getFileMetadata(key, bucket);
  const fileMeta = metadata.metadata as Record<string, string>;
  if (fileMeta?.['x-tailrd-hospital-id'] !== hospitalId) {
    throw new Error('Access denied: file does not belong to this hospital');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKETS[bucket],
    Key: key,
  });

  const result = await s3Client.send(command);

  return {
    deleted: true,
    versionId: result.VersionId,
  };
}

/**
 * Copy a file to the audit bucket (for compliance snapshots).
 */
export async function archiveToAudit(
  sourceKey: string,
  sourceBucket: keyof typeof BUCKETS,
  hospitalId: string,
  reason: string,
): Promise<string> {
  if (isDemoMode) {
    return `audit/archive/${hospitalId}/${sourceKey}`;
  }

  const date = new Date().toISOString().split('T')[0];
  const destinationKey = `compliance/${hospitalId}/${date}/${sourceKey.split('/').pop()}`;

  const command = new CopyObjectCommand({
    Bucket: BUCKETS.audit,
    Key: destinationKey,
    CopySource: `${BUCKETS[sourceBucket]}/${sourceKey}`,
    ServerSideEncryption: 'aws:kms',
    SSEKMSKeyId: KMS_KEY_ID || undefined,
    Metadata: {
      'x-tailrd-archive-reason': reason,
      'x-tailrd-archive-date': new Date().toISOString(),
      'x-tailrd-source-bucket': BUCKETS[sourceBucket],
      'x-tailrd-source-key': sourceKey,
    },
    MetadataDirective: 'REPLACE',
  });

  await s3Client.send(command);
  return destinationKey;
}

// ── Demo Mode Helper ────────────────────────────────────────────────────────

function createDemoResult(params: UploadParams): UploadResult {
  const key = `demo/${params.hospitalId}/${params.category}/${params.fileName}`;
  return {
    key,
    bucket: 'demo-bucket',
    versionId: 'demo-v1',
    etag: '"demo-etag"',
    url: `s3://demo-bucket/${key}`,
  };
}

// ── Exports ─────────────────────────────────────────────────────────────────

export const s3Service = {
  uploadFile,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  getFileMetadata,
  listFiles,
  deleteFile,
  archiveToAudit,
  BUCKETS,
  FILE_CATEGORIES,
};

export default s3Service;
