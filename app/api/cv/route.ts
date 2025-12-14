import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  uploadFile,
  validateFile,
  scanFileForVirus,
  encryptMetadata,
} from "@/lib/storage";
import { parseCv } from "@/lib/cv-parser";
import { logEvent } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;
    const fileName = file.name;

    // Validate file
    const validation = validateFile(buffer, fileName, mimeType);
    if (!validation.valid) {
      // Log failed upload
      await logEvent({
        userId: session.userId,
        eventType: "CV_UPLOADED",
        entityType: "CvDocument",
        details: {
          error: validation.error,
          fileName,
        },
      });

      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Scan for viruses
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

    // Upload file to storage
    const { fileId, url } = await uploadFile({
      fileName,
      mimeType,
      buffer,
    });

    // Encrypt metadata for compliance
    const { hash } = encryptMetadata({
      fileName,
      mimeType,
      size: buffer.length.toString(),
      uploadedAt: new Date().toISOString(),
    });

    // Create CV document in database
    const cvDocument = await prisma.cvDocument.create({
      data: {
        userId: session.userId,
        fileName,
        fileSize: buffer.length,
        mimeType,
        storageUrl: `${fileId}:${url}`, // Store both ID and URL for reference
        isEncrypted: true,
        virusScanUrl: scanResult.scanUrl,
        metadataHash: hash,
      },
    });

    // Delete previous CV if exists (keep only latest)
    const previousCvs = await prisma.cvDocument.findMany({
      where: {
        userId: session.userId,
        id: { not: cvDocument.id },
      },
      orderBy: { uploadedAt: "desc" },
      skip: 0,
    });

    for (const prevCv of previousCvs) {
      // Delete related parsed CV
      await prisma.parsedCv.deleteMany({
        where: { cvDocumentId: prevCv.id },
      });
      // Delete the CV document
      await prisma.cvDocument.delete({
        where: { id: prevCv.id },
      });
    }

    // Log the upload
    await logEvent({
      userId: session.userId,
      eventType: "CV_UPLOADED",
      entityType: "CvDocument",
      entityId: cvDocument.id,
      cvDocumentId: cvDocument.id,
      details: {
        fileName,
        size: buffer.length,
      },
    });

    // Parse CV in background (or synchronously for now)
    try {
      const parsedData = await parseCv(buffer, fileName, mimeType);

      // Create ParsedCv record
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

      // Log successful parsing
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
          success: true,
          cvDocument,
          parsedCv,
        },
        { status: 201 }
      );
    } catch (parseError) {
      // Create ParsedCv with error status
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
      });

      // Log parsing failure
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
          success: false,
          cvDocument,
          parsedCv,
          error: "CV uploaded but parsing failed",
        },
        { status: 202 } // Accepted but with parsing error
      );
    }
  } catch (error) {
    console.error("CV upload error:", error);

    return NextResponse.json(
      {
        error: "Failed to process CV upload",
        details:
          error instanceof Error ? error.message : "Unknown error",
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

    // Get latest CV with parsed data
    const cvDocument = await prisma.cvDocument.findFirst({
      where: { userId: session.userId },
      orderBy: { uploadedAt: "desc" },
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

    return NextResponse.json({ cvDocument });
  } catch (error) {
    console.error("CV GET error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve CV" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "CV ID required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const cvDocument = await prisma.cvDocument.findUnique({
      where: { id: cvId },
    });

    if (!cvDocument || cvDocument.userId !== session.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete parsed CV first (cascades from schema)
    await prisma.parsedCv.deleteMany({
      where: { cvDocumentId: cvId },
    });

    // Delete CV document
    await prisma.cvDocument.delete({
      where: { id: cvId },
    });

    // Log deletion
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

    return NextResponse.json(
      { error: "Failed to delete CV" },
      { status: 500 }
    );
  }
}
