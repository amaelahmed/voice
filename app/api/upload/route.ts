import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const id = randomUUID();
    // Assuming the file is audio/webm (standard for MediaRecorder)
    // We can try to detect extension from file.type or just assume webm
    let extension = "webm";
    if (file.type === "audio/mp4") extension = "mp4";
    if (file.type === "audio/wav") extension = "wav";
    if (file.type === "audio/mpeg") extension = "mp3";
    
    // Use the detected extension or fallback
    const fileName = `${id}.${extension}`;
    const storageDir = join(process.cwd(), "storage");
    
    // Ensure storage directory exists
    try {
        await mkdir(storageDir, { recursive: true });
    } catch (e) {
        // Ignore if it exists
    }
    
    const filePath = join(storageDir, fileName);

    await writeFile(filePath, buffer);

    // Return the shareable link ID (which is the UUID)
    // We could return the full URL, but constructing it on frontend is also fine
    return NextResponse.json({ id, extension });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
