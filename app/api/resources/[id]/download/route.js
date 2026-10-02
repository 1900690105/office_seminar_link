import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req, ctx) {
  try {
    // ---------------------------------------------------------
    // 1. GET RESOURCE ID
    // ---------------------------------------------------------

    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Resource ID is required",
        },
        {
          status: 400,
        },
      );
    }

    // ---------------------------------------------------------
    // 2. GET REGISTRATION ID
    // ---------------------------------------------------------

    const { searchParams } = new URL(req.url);

    const registrationId = searchParams.get("registrationId");

    if (!registrationId) {
      return NextResponse.json(
        {
          error: "Registration required",
        },
        {
          status: 401,
        },
      );
    }

    // ---------------------------------------------------------
    // 3. FIND REGISTRATION
    // ---------------------------------------------------------

    const registration = await prisma.registration.findUnique({
      where: {
        id: registrationId,
      },
    });

    if (!registration) {
      return NextResponse.json(
        {
          error: "Invalid registration",
        },
        {
          status: 401,
        },
      );
    }

    // ---------------------------------------------------------
    // 4. FIND RESOURCE
    // ---------------------------------------------------------

    const resource = await prisma.resource.findUnique({
      where: {
        id,
      },
    });

    if (!resource) {
      return NextResponse.json(
        {
          error: "Resource not found",
        },
        {
          status: 404,
        },
      );
    }

    // ---------------------------------------------------------
    // 5. CHECK SEMINAR ACCESS
    // ---------------------------------------------------------

    if (registration.seminarId !== resource.seminarId) {
      return NextResponse.json(
        {
          error: "You are not registered for this seminar",
        },
        {
          status: 403,
        },
      );
    }

    // ---------------------------------------------------------
    // 6. GET CLOUDINARY FILE
    // ---------------------------------------------------------

    const cloudinaryResponse = await fetch(resource.cloudinaryUrl);

    if (!cloudinaryResponse.ok) {
      console.error("Cloudinary fetch failed:", cloudinaryResponse.status);

      return NextResponse.json(
        {
          error: "Unable to retrieve file",
        },
        {
          status: 502,
        },
      );
    }

    // ---------------------------------------------------------
    // 7. GET FILE CONTENT
    // ---------------------------------------------------------

    const fileBuffer = await cloudinaryResponse.arrayBuffer();

    // ---------------------------------------------------------
    // 8. DETERMINE CONTENT TYPE
    // ---------------------------------------------------------

    const contentTypes = {
      PDF: "application/pdf",

      PPT: "application/vnd.ms-powerpoint",

      PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

      DOC: "application/msword",

      DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      OTHER: "application/octet-stream",
    };

    const contentType =
      contentTypes[resource.fileType] || "application/octet-stream";

    // ---------------------------------------------------------
    // 9. CONTENT DISPOSITION
    // ---------------------------------------------------------

    /*
     * PDF:
     * Open directly in browser.
     *
     * PPT/DOC:
     * Download because browsers generally cannot
     * display these formats directly.
     */

    const disposition = resource.fileType === "PDF" ? "inline" : "attachment";

    // ---------------------------------------------------------
    // 10. RETURN FILE
    // ---------------------------------------------------------

    return new NextResponse(fileBuffer, {
      status: 200,

      headers: {
        "Content-Type": contentType,

        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(
          resource.fileName,
        )}"`,

        "Content-Length": String(fileBuffer.byteLength),

        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("RESOURCE DOWNLOAD ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to access resource",
      },
      {
        status: 500,
      },
    );
  }
}
