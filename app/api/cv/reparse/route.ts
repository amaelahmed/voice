import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFile } from "@/lib/storage";
import { parseCv } from "@/lib/cv-parser";
import { logEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cvDocumentId } = await request.json();

    if (!cvDocumentId) {
      return NextResponse.json(
        { error: "CV document ID required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const cvDocument = await prisma.cvDocument.findUnique({
      where: { id: cvDocumentId },
    });

    if (!cvDocument || cvDocument.userId !== session.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get the stored file
    const fileId = cvDocument.storageUrl.split(":")[0];
    const fileBuffer = await getFile(fileId);

    if (!fileBuffer) {
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 404 }
      );
    }

    // Update parsing status to IN_PROGRESS
    await prisma.parsedCv.updateMany({
      where: { cvDocumentId },
      data: { parsingStatus: "IN_PROGRESS" },
    });

    // Log retry attempt
    await logEvent({
      userId: session.userId,
      eventType: "PARSING_RETRIED",
      entityType: "ParsedCv",
      cvDocumentId,
    });

    try {
      // Re-parse the CV
      const parsedData = await parseCv(
        fileBuffer,
        cvDocument.fileName,
        cvDocument.mimeType
      );

      // Delete old parsed data
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

      // Update ParsedCv with new data
      const parsedCv = await prisma.parsedCv.findFirst({
        where: { cvDocumentId },
      });

      if (!parsedCv) {
        return NextResponse.json(
          { error: "Parsed CV not found" },
          { status: 404 }
        );
      }

      const updated = await prisma.parsedCv.update({
        where: { id: parsedCv.id },
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
      });

      // Log successful re-parsing
      await logEvent({
        userId: session.userId,
        eventType: "CV_PARSED",
        entityType: "ParsedCv",
        entityId: updated.id,
        cvDocumentId,
        parsedCvId: updated.id,
        details: {
          reparse: true,
          experienceCount: parsedData.experiences.length,
          skillCount: parsedData.skills.length,
          educationCount: parsedData.educations.length,
        },
      });

      return NextResponse.json({
        success: true,
        parsedCv: updated,
      });
    } catch (parseError) {
      // Update with error status
      await prisma.parsedCv.updateMany({
        where: { cvDocumentId },
        data: {
          parsingStatus: "FAILED",
          parsingError:
            parseError instanceof Error
              ? parseError.message
              : "Unknown parsing error",
        },
      });

      // Log failure
      const parsedCv = await prisma.parsedCv.findFirst({
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
          error:
            parseError instanceof Error
              ? parseError.message
              : "Unknown error",
        },
      });

      return NextResponse.json(
        {
          error: "Parsing failed",
          details:
            parseError instanceof Error
              ? parseError.message
              : "Unknown error",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("CV reparse error:", error);

    return NextResponse.json(
      {
        error: "Failed to reparse CV",
        details:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
