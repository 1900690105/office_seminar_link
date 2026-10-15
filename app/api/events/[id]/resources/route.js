import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req, ctx) {
  try {
    // =====================================================
    // 1. AUTHENTICATION
    // =====================================================

    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    // =====================================================
    // 2. GET SEMINAR ID
    // =====================================================

    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Seminar ID is required",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 3. CHECK SEMINAR
    // =====================================================

    const seminar = await prisma.seminar.findUnique({
      where: {
        id,
      },
    });

    if (!seminar) {
      return NextResponse.json(
        {
          error: "Seminar not found",
        },
        {
          status: 404,
        },
      );
    }

    // =====================================================
    // 4. READ FORM DATA
    // =====================================================

    const formData = await req.formData();

    const file = formData.get("file");
    const title = formData.get("title");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        {
          error: "File is required",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 5. FILE SIZE
    // =====================================================

    const MAX_FILE_SIZE = 25 * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "Maximum file size is 25MB",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 6. FILE EXTENSION
    // =====================================================

    const extension = file.name?.split(".").pop()?.toLowerCase() || "";

    const allowedExtensions = ["pdf", "ppt", "pptx", "doc", "docx"];

    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        {
          error: "Unsupported file type. Allowed: PDF, PPT, PPTX, DOC, DOCX",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 7. FILE NAME
    // =====================================================

    const originalFileName = file.name || "document";

    const fileNameWithoutExtension = originalFileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/^_+|_+$/g, "");

    const safeFileName = fileNameWithoutExtension || "document";

    // =====================================================
    // 8. CREATE UNIQUE PUBLIC ID
    //
    // IMPORTANT:
    // NO Cloudinary folder is used here.
    // =====================================================

    const publicId = `seminar_${seminar.id}_${Date.now()}_${safeFileName}`;

    console.log("==========================================");

    console.log("CLOUDINARY UPLOAD");

    console.log({
      seminarId: seminar.id,
      fileName: originalFileName,
      fileSize: file.size,
      extension,
      publicId,
    });

    // =====================================================
    // 9. READ FILE
    // =====================================================

    const buffer = Buffer.from(await file.arrayBuffer());

    // =====================================================
    // 10. UPLOAD TO CLOUDINARY
    // =====================================================

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",

          type: "upload",

          public_id: publicId,

          overwrite: false,

          invalidate: true,
        },

        (error, uploaded) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(uploaded);
        },
      );

      stream.end(buffer);
    });

    console.log("CLOUDINARY UPLOAD SUCCESS:");

    console.log({
      publicId: result.public_id,

      secureUrl: result.secure_url,

      resourceType: result.resource_type,

      bytes: result.bytes,
    });

    // =====================================================
    // 11. RESOURCE TYPE
    // =====================================================

    const typeMap = {
      pdf: "PDF",
      ppt: "PPT",
      pptx: "PPTX",
      doc: "DOC",
      docx: "DOCX",
    };

    const fileType = typeMap[extension] || "OTHER";

    // =====================================================
    // 12. SAVE RESOURCE IN DATABASE
    // =====================================================

    const resource = await prisma.resource.create({
      data: {
        seminarId: seminar.id,

        title: String(title || originalFileName),

        fileName: originalFileName,

        fileType,

        cloudinaryUrl: result.secure_url,

        publicId: result.public_id,

        // Keep this only if your Prisma schema
        // contains bytes Int?
        bytes: file.size,
      },
    });

    console.log("RESOURCE SAVED:", resource.id);

    console.log("==========================================");

    // =====================================================
    // 13. RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: true,

        resource,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("==========================================");

    console.error("RESOURCE UPLOAD ERROR");

    console.error(error);

    console.error("==========================================");

    return NextResponse.json(
      {
        success: false,

        error: error?.message || "File upload failed",

        name: error?.name || null,

        http_code: error?.http_code || null,
      },
      {
        status: error?.http_code || 500,
      },
    );
  }
}
