import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { logEvent } from "@/lib/audit";
import { parseCv } from "@/lib/cv-parser";
import { prisma } from "@/lib/db";
import {
  deleteFile,
  encryptMetadata,
  scanFileForVirus,
  uploadFile,
  validateFile,
} from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    const fileName = file.name;

    const validation = validateFile(buffer, fileName, mimeType);
    if (!validation.valid) {
      await logEvent({
        userId: session.userId,
        eventType: "CV_UPLOADED",
        entityType: "CvDocument",
        details: {
          error: validation.error ?? "Invalid file",
          fileName,
        },
      });

      return NextResponse.json(
        { error: validation.error ?? "Invalid file" },
        { status: 400 }
      );
    }

    const scanResult = await scanFileForVirus();
    if (!scanResult.clean) {
      await logEvent({
        userId: session.userId,
        eventType: "CV_UPLOADED",
        entityType: "CvDocument",
        details: {
          error: "File failed virus scan",
          fileName,
        },
      });

      return NextResponse.json(
        { error: "File failed security scan" },
        { status: 400 }
      );
    }

    const { fileId } = await uploadFile({
      fileName,
      mimeType,
      buffer,
    });

    const checksumSha256 = createHash("sha256").update(buffer).digest("hex");

    const { hash: metadataHash } = encryptMetadata({
      fileName,
      mimeType,
      size: buffer.length.toString(),
      uploadedAt: new Date().toISOString(),
    });

    const existingCvDocument = await prisma.cvDocument.findFirst({
      where: {
        userId: session.userId,
        checksumSha256,
      },
    });

    if (existingCvDocument) {
      await deleteFile(fileId);

      const parsedCv = await prisma.parsedCv.findUnique({
        where: { cvDocumentId: existingCvDocument.id },
        include: {
          experiences: true,
          skills: true,
          educations: true,
        },
      });

      return NextResponse.json({
        cvDocument: existingCvDocument,
        parsedCv,
      });
    }

    const cvDocument = await prisma.cvDocument.create({
      data: {
        userId: session.userId,
        originalFileName: fileName,
        mimeType,
        sizeBytes: buffer.length,
        storageProvider: "memory",
        storageKey: fileId,
        checksumSha256,
      },
    });

    const previousCvs = await prisma.cvDocument.findMany({
      where: {
        userId: session.userId,
        id: { not: cvDocument.id },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const prevCv of previousCvs) {
      await deleteFile(prevCv.storageKey);
      await prisma.cvDocument.delete({
        where: { id: prevCv.id },
      });
    }

    await logEvent({
      userId: session.userId,
      eventType: "CV_UPLOADED",
      entityType: "CvDocument",
      entityId: cvDocument.id,
      cvDocumentId: cvDocument.id,
      details: {
        fileName,
        sizeBytes: buffer.length,
        mimeType,
        scanUrl: scanResult.scanUrl ?? null,
        metadataHash,
        storageKey: fileId,
      },
    });

    try {
      const parsedData = await parseCv(buffer, fileName, mimeType);

      const parsedCv = await prisma.parsedCv.create({
        data: {
          cvDocumentId: cvDocument.id,
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
        cvDocumentId: cvDocument.id,
        parsedCvId: parsedCv.id,
        details: {
          experienceCount: parsedData.experiences.length,
          skillCount: parsedData.skills.length,
          educationCount: parsedData.educations.length,
        },
      });

      return NextResponse.json(
        {
          cvDocument,
          parsedCv,
        },
        { status: 201 }
      );
    } catch (parseError) {
      const parsedCv = await prisma.parsedCv.create({
        data: {
          cvDocumentId: cvDocument.id,
          userId: session.userId,
          parsingStatus: "FAILED",
          parsingError:
            parseError instanceof Error
              ? parseError.message
              : "Unknown parsing error",
        },
        include: {
          experiences: true,
          skills: true,
          educations: true,
        },
      });

      await logEvent({
        userId: session.userId,
        eventType: "PARSING_FAILED",
        entityType: "ParsedCv",
        entityId: parsedCv.id,
        cvDocumentId: cvDocument.id,
        parsedCvId: parsedCv.id,
        details: {
          error:
            parseError instanceof Error
              ? parseError.message
              : "Unknown error",
        },
      });

      return NextResponse.json(
        {
          cvDocument,
          parsedCv,
          error: "CV uploaded but parsing failed",
        },
        { status: 202 }
      );
    }
  } catch (error) {
    console.error("CV upload error:", error);

    return NextResponse.json(
      {
        error: "Failed to process CV upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const record = await prisma.cvDocument.findFirst({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        parsedCv: {
          include: {
            experiences: true,
            skills: true,
            educations: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ cvDocument: null, parsedCv: null });
    }

    const { parsedCv, ...cvDocument } = record;

    return NextResponse.json({
      cvDocument,
      parsedCv: parsedCv ?? null,
    });
  } catch (error) {
    console.error("CV GET error:", error);

    return NextResponse.json({ error: "Failed to retrieve CV" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cvId = searchParams.get("id");

    if (!cvId) {
      return NextResponse.json({ error: "CV ID required" }, { status: 400 });
    }

    const cvDocument = await prisma.cvDocument.findUnique({
      where: { id: cvId },
    });

    if (!cvDocument || cvDocument.userId !== session.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await deleteFile(cvDocument.storageKey);

    await prisma.cvDocument.delete({
      where: { id: cvId },
    });

    await logEvent({
      userId: session.userId,
      eventType: "CV_DELETED",
      entityType: "CvDocument",
      entityId: cvId,
      cvDocumentId: cvId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CV DELETE error:", error);

    return NextResponse.json({ error: "Failed to delete CV" }, { status: 500 });
  }
}
