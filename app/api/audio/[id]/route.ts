import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate ID format (simple UUID check or alphanumeric)
    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const storageDir = join(process.cwd(), "storage");
    
    if (!existsSync(storageDir)) {
         return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    
    // Find file with this ID
    // If the ID in url includes extension, use it directly
    // If not, search for it
    
    let fileName = id;
    let filePath = join(storageDir, fileName);
    
    if (!existsSync(filePath)) {
        // Try to find file starting with id.
        const files = await readdir(storageDir);
        const foundFile = files.find(f => f.startsWith(id + "."));
        
        if (foundFile) {
            fileName = foundFile;
            filePath = join(storageDir, fileName);
        } else {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }
    }

    const fileBuffer = await readFile(filePath);
    
    // Determine content type
    let contentType = "application/octet-stream";
    if (fileName.endsWith(".webm")) contentType = "audio/webm";
    if (fileName.endsWith(".mp4")) contentType = "audio/mp4";
    if (fileName.endsWith(".mp3")) contentType = "audio/mpeg";
    if (fileName.endsWith(".wav")) contentType = "audio/wav";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("Error serving audio:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
