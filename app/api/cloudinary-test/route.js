import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    console.log("=================================");
    console.log("CLOUDINARY TEST ROUTE HIT");
    console.log("=================================");

    const body = await req.json();

    console.log("REQUEST BODY:", body);

    const { publicId } = body;

    if (!publicId) {
      return NextResponse.json(
        {
          error: "publicId is required",
        },
        {
          status: 400,
        },
      );
    }

    console.log("PUBLIC ID:");
    console.log(publicId);

    console.log("CLOUDINARY CONFIG:", {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKeyExists: !!process.env.CLOUDINARY_API_KEY,
      apiSecretExists: !!process.env.CLOUDINARY_API_SECRET,
    });

    // -----------------------------------------------------
    // DELETE RAW UPLOAD
    // -----------------------------------------------------

    const result = await cloudinary.api.delete_resources([publicId], {
      resource_type: "raw",
      type: "upload",
      invalidate: true,
    });

    console.log("=================================");

    console.log("CLOUDINARY DELETE RESULT:");

    console.log(JSON.stringify(result, null, 2));

    console.log("=================================");

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("=================================");

    console.error("CLOUDINARY DELETE ERROR");

    console.error(error);

    console.error("=================================");

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Cloudinary deletion failed",

        name: error?.name || null,

        http_code: error?.http_code || null,

        error: error?.error || null,
      },
      {
        status: error?.http_code || 500,
      },
    );
  }
}
