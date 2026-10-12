import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);

function errorResponse(error, status) {
  return NextResponse.json(
    { success: false, error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function uploadToCloudinary(buffer, originalName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "electrosoft/staff-signatures",
        resource_type: "image",
        type: "upload",
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        context: {
          original_name: originalName.slice(0, 200),
        },
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });
}

function serializeSignature(signature) {
  return {
    id: signature.id,
    name: signature.name,
    role: signature.role,
    imageUrl: signature.imageUrl,
    isActive: signature.isActive,
    createdAt: signature.createdAt,
    updatedAt: signature.updatedAt,
  };
}

// GET /api/staff-signatures
// Lists the signature library for the admin dashboard.
export async function GET() {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return errorResponse("Unauthorized.", 401);
    }

    const signatures = await prisma.staffSignature.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        signatures,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("STAFF SIGNATURE LIST ERROR:", error);

    return errorResponse("Unable to load staff signatures.", 500);
  }
}

// POST /api/staff-signatures
// Uploads a signature once and saves it in the reusable library.
export async function POST(request) {
  let uploadedPublicId = null;

  try {
    const admin = await getAdmin();

    if (!admin) {
      return errorResponse("Unauthorized.", 401);
    }

    const formData = await request.formData();

    const nameValue = formData.get("name");
    const roleValue = formData.get("role");
    const file = formData.get("signature");

    const name = typeof nameValue === "string" ? nameValue.trim() : "";

    const role = typeof roleValue === "string" ? roleValue.trim() : "";

    if (!name || name.length > 100) {
      return errorResponse(
        "Staff name is required and must be at most 100 characters.",
        400,
      );
    }

    if (role.length > 100) {
      return errorResponse("Role must be at most 100 characters.", 400);
    }

    if (
      !file ||
      typeof file === "string" ||
      typeof file.arrayBuffer !== "function"
    ) {
      return errorResponse("Please upload a signature image.", 400);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return errorResponse("Signature must be a PNG or JPEG image.", 400);
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return errorResponse(
        "Signature image must be larger than 0 bytes and no larger than 5 MB.",
        400,
      );
    }

    // Avoid accidentally registering duplicate staff names.
    const existing = await prisma.staffSignature.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existing) {
      return errorResponse(
        "A staff signature with this name already exists. Use the existing library entry or a different name.",
        409,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadToCloudinary(buffer, file.name);

    if (!result?.secure_url || !result?.public_id) {
      throw new Error("Cloudinary did not return the uploaded image details.");
    }

    uploadedPublicId = result.public_id;

    // Save the uploaded signature in PostgreSQL.
    const signature = await prisma.staffSignature.create({
      data: {
        name,
        role: role || null,
        imageUrl: result.secure_url,
        publicId: result.public_id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Staff signature added to the library.",
        signature: serializeSignature(signature),
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    // If PostgreSQL saving fails after upload, clean up the unused image.
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId, {
          resource_type: "image",
          type: "upload",
        });
      } catch (cleanupError) {
        console.error(
          "STAFF SIGNATURE CLOUDINARY CLEANUP ERROR:",
          cleanupError,
        );
      }
    }

    console.error("STAFF SIGNATURE CREATE ERROR:", error);

    return errorResponse(
      "Unable to save the staff signature. Please try again.",
      500,
    );
  }
}
