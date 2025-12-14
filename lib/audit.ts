import { prisma } from "./db";

export type EventType =
  | "CV_UPLOADED"
  | "CV_PARSED"
  | "CV_DELETED"
  | "PARSING_FAILED"
  | "PARSING_RETRIED"
  | "CV_REDOWNLOADED";

export type EntityType = "CvDocument" | "ParsedCv";

export interface LogEventOptions {
  userId: string;
  eventType: EventType;
  entityType: EntityType;
  entityId?: string;
  cvDocumentId?: string;
  parsedCvId?: string;
  details?: Record<string, unknown>;
}

/**
 * Log an application event for audit trail
 */
export async function logEvent(options: LogEventOptions): Promise<void> {
  try {
    await prisma.applicationEvent.create({
      data: {
        userId: options.userId,
        eventType: options.eventType,
        entityType: options.entityType,
        entityId: options.entityId,
        cvDocumentId: options.cvDocumentId,
        parsedCvId: options.parsedCvId,
        details: options.details ? JSON.stringify(options.details) : null,
      },
    });
  } catch (error) {
    console.error("Failed to log event:", error);
    // Don't throw - logging failures shouldn't break the application
  }
}

/**
 * Get audit log for a user's CV operations
 */
export async function getAuditLog(
  userId: string,
  options?: { cvDocumentId?: string; limit?: number }
) {
  const where: Record<string, unknown> = { userId };
  
  if (options?.cvDocumentId) {
    where.cvDocumentId = options.cvDocumentId;
  }
  
  return await prisma.applicationEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options?.limit || 50,
  });
}
