import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { parseCv } from "@/lib/cv-parser";
import { prisma } from "@/lib/db";
import { getFile } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cvDocumentId } = (await request.json()) as {
      cvDocumentId?: string;
    };

    if (!cvDocumentId) {
      return NextResponse.json(
        { error: "CV document ID required" },
        { status: 400 }
      );
    }

    const cvDocument = await prisma.cvDocument.findUnique({
      where: { id: cvDocumentId },
    });

    if (!cvDocument || cvDocument.userId !== session.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const fileBuffer = await getFile(cvDocument.storageKey);

    if (!fileBuffer) {
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 404 }
      );
    }

    await prisma.parsedCv.updateMany({
      where: { cvDocumentId },
      data: { parsingStatus: "IN_PROGRESS" },
    });

    await logEvent({
      userId: session.userId,
      eventType: "PARSING_RETRIED",
      entityType: "ParsedCv",
      cvDocumentId,
    });

    try {
      const parsedData = await parseCv(
        fileBuffer,
        cvDocument.originalFileName,
        cvDocument.mimeType ?? "application/octet-stream"
      );

      await prisma.experience.deleteMany({
        where: {
          parsedCv: { cvDocumentId },
        },
      });

      await prisma.skill.deleteMany({
        where: {
          parsedCv: { cvDocumentId },
        },
      });

      await prisma.education.deleteMany({
        where: {
          parsedCv: { cvDocumentId },
        },
      });

      const existing = await prisma.parsedCv.findUnique({
        where: { cvDocumentId },
      });

      const parsedCv = existing
        ? await prisma.parsedCv.update({
            where: { id: existing.id },
            data: {
              headline: parsedData.headline,
              summary: parsedData.summary,
              parsingStatus: "SUCCESS",
              parsingError: null,
              experiences: {
                create: parsedData.experiences,
              },
              skills: {
                create: parsedData.skills,
              },
              educations: {
                create: parsedData.educations,
              },
            },
            include: {
              experiences: true,
              skills: true,
              educations: true,
            },
          })
        : await prisma.parsedCv.create({
            data: {
              cvDocumentId,
              userId: session.userId,
              headline: parsedData.headline,
              summary: parsedData.summary,
              parsingStatus: "SUCCESS",
              experiences: {
                create: parsedData.experiences,
              },
              skills: {
                create: parsedData.skills,
              },
              educations: {
                create: parsedData.educations,
              },
            },
            include: {
              experiences: true,
              skills: true,
              educations: true,
            },
          });

      await logEvent({
        userId: session.userId,
        eventType: "CV_PARSED",
        entityType: "ParsedCv",
        entityId: parsedCv.id,
        cvDocumentId,
        parsedCvId: parsedCv.id,
        details: {
          reparse: true,
          experienceCount: parsedData.experiences.length,
          skillCount: parsedData.skills.length,
          educationCount: parsedData.educations.length,
        },
      });

      return NextResponse.json({
        success: true,
        parsedCv,
      });
    } catch (parseError) {
      const errorMessage =
        parseError instanceof Error ? parseError.message : "Unknown parsing error";

      await prisma.parsedCv.updateMany({
        where: { cvDocumentId },
        data: {
          parsingStatus: "FAILED",
          parsingError: errorMessage,
        },
      });

      const parsedCv = await prisma.parsedCv.findUnique({
        where: { cvDocumentId },
      });

      await logEvent({
        userId: session.userId,
        eventType: "PARSING_FAILED",
        entityType: "ParsedCv",
        entityId: parsedCv?.id,
        cvDocumentId,
        parsedCvId: parsedCv?.id,
        details: {
          reparse: true,
          error: errorMessage,
        },
      });

      return NextResponse.json(
        {
          error: "Parsing failed",
          details: errorMessage,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("CV reparse error:", error);

    return NextResponse.json(
      {
        error: "Failed to reparse CV",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
