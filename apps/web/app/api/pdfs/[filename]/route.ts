// BuildOS - PDF Download API
// Serves generated PDF files

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const PDF_STORAGE_DIR = process.env.PDF_STORAGE_DIR || "/tmp/buildos-pdfs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Security: validate filename (prevent path traversal)
    if (
      !filename ||
      filename.includes("..") ||
      filename.includes("/") ||
      !filename.endsWith(".pdf")
    ) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    // Read PDF file
    const filepath = path.join(PDF_STORAGE_DIR, filename);

    try {
      const fileBuffer = await fs.readFile(filepath);

      // Return PDF with proper headers
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${filename}"`,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (fileError) {
      console.error("PDF file not found:", filepath, fileError);
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("PDF download error:", error);
    return NextResponse.json(
      { error: "Failed to download PDF" },
      { status: 500 }
    );
  }
}
