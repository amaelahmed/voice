import { NextRequest, NextResponse } from "next/server";

import { getFile } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const fileBuffer = await getFile(fileId);

    if (!fileBuffer) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const body = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    ) as ArrayBuffer;

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
  } catch (error) {
    console.error("Storage GET error:", error);

    return NextResponse.json({ error: "Failed to retrieve file" }, { status: 500 });
  }
}
