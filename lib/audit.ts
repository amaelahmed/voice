import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

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
  details?: Prisma.InputJsonValue;
}

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
        details: options.details,
      },
    });
  } catch (error) {
    console.error("Failed to log event:", error);
  }
}

export async function getAuditLog(
  userId: string,
  options?: { cvDocumentId?: string; limit?: number }
) {
  return prisma.applicationEvent.findMany({
    where: {
      userId,
      cvDocumentId: options?.cvDocumentId,
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
  });
}
