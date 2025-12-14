import { randomUUID } from "crypto";

// Simple in-memory storage for development
// In production, use AWS S3, Supabase Storage, or similar
const fileStorage = new Map<string, Buffer>();

export interface StorageUploadOptions {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface StorageFileMetadata {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

/**
 * Upload a file to storage and return metadata
 */
export async function uploadFile(
  options: StorageUploadOptions
): Promise<{ fileId: string; url: string }> {
  const fileId = randomUUID();
  
  // Store file in memory (development only)
  fileStorage.set(fileId, options.buffer);
  
  // In production, you would:
  // 1. Upload to S3/Supabase Storage
  // 2. Return the public URL
  const url = `/api/storage/${fileId}`;
  
  return { fileId, url };
}

/**
 * Retrieve a file from storage
 */
export async function getFile(fileId: string): Promise<Buffer | null> {
  return fileStorage.get(fileId) || null;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(fileId: string): Promise<boolean> {
  return fileStorage.delete(fileId);
}

/**
 * Stub for virus scanning
 * In production, integrate with ClamAV, VirusTotal, etc.
 */
export async function scanFileForVirus(): Promise<{ clean: boolean; scanUrl?: string }> {
  // Development: Always pass
  // Production: Integrate with actual virus scanner
  
  return {
    clean: true,
    scanUrl: "http://scan.example.com/result/stub",
  };
}

/**
 * Encrypt metadata for compliance
 * In production, use proper encryption (AES-256-GCM)
 */
export function encryptMetadata(data: Record<string, string>): {
  encrypted: string;
  hash: string;
} {
  // Development: Simple base64 encoding
  // Production: Use crypto library with proper encryption
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64");
  const hash = Buffer.from(
    JSON.stringify(data).split("").reverse().join("")
  ).toString("base64");
  
  return { encrypted: encoded, hash };
}

/**
 * Validate file type and size
 */
export function validateFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  const ALLOWED_EXTENSIONS = [".pdf", ".docx"];
  
  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: "File size exceeds 10MB limit" };
  }
  
  // Check MIME type
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return { valid: false, error: "Only PDF and DOCX files are allowed" };
  }
  
  // Check extension
  const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: "File extension must be .pdf or .docx" };
  }
  
  return { valid: true };
}
