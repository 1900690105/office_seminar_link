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

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const SIGNATURE_CONFIG = {
  trainerSignature: {
    urlField: "trainerSignatureUrl",
    publicIdField: "trainerSignaturePublicId",
    staffIdField: "trainerSignatureStaffId",
    folder: "seminars/certificates/signatures",
  },
  authorizedSignature: {
    urlField: "authorizedSignatureUrl",
    publicIdField: "authorizedSignaturePublicId",
    staffIdField: "authorizedSignatureStaffId",
    folder: "seminars/certificates/signatures",
  },
};

function uploadToCloudinary(buffer, folder, originalName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        type: "upload",
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        context: {
          original_name: originalName,
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

function errorResponse(message, status) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(req, { params }) {
  const uploadedAssets = [];

  try {
    const admin = await getAdmin();

    if (!admin) {
      return errorResponse("Unauthorized.", 401);
    }

    const { id } = await params;

    if (!id) {
      return errorResponse("Seminar ID is required.", 400);
    }

    const seminar = await prisma.seminar.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!seminar) {
      return errorResponse("Seminar not found.", 404);
    }

    const formData = await req.formData();
    const updates = {};

    for (const [fieldName, config] of Object.entries(SIGNATURE_CONFIG)) {
      const staffIdFieldPresent = formData.has(config.staffIdField);
      const rawStaffId = formData.get(config.staffIdField);
      const staffId = typeof rawStaffId === "string" ? rawStaffId.trim() : "";

      const rawFile = formData.get(fieldName);
      const file =
        rawFile &&
        typeof rawFile !== "string" &&
        typeof rawFile.arrayBuffer === "function" &&
        rawFile.size > 0
          ? rawFile
          : null;

      // Select an existing reusable staff signature.
      if (staffIdFieldPresent) {
        if (!staffId) {
          updates[config.staffIdField] = null;
          updates[config.urlField] = null;
          updates[config.publicIdField] = null;
        } else {
          const staffSignature = await prisma.staffSignature.findFirst({
            where: {
              id: staffId,
              isActive: true,
            },
            select: {
              id: true,
              imageUrl: true,
              publicId: true,
            },
          });

          if (!staffSignature) {
            return errorResponse(
              `The selected ${fieldName} staff signature was not found or is inactive.`,
              400,
            );
          }

          updates[config.staffIdField] = staffSignature.id;
          updates[config.urlField] = staffSignature.imageUrl;
          updates[config.publicIdField] = staffSignature.publicId ?? null;
        }
      }

      // Backward compatibility: allow direct legacy signature uploads.
      // Prefer selecting an existing StaffSignature in the admin UI.
      if (file) {
        if (!ALLOWED_TYPES.has(file.type)) {
          return errorResponse(
            `${fieldName} must be a PNG, JPG, JPEG or WEBP image.`,
            400,
          );
        }

        if (file.size > MAX_FILE_SIZE) {
          return errorResponse(`${fieldName} cannot exceed 5 MB.`, 400);
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const result = await uploadToCloudinary(
          buffer,
          config.folder,
          file.name,
        );

        if (!result?.secure_url || !result?.public_id) {
          throw new Error(`Cloudinary upload failed for ${fieldName}.`);
        }

        uploadedAssets.push({
          fieldName,
          publicId: result.public_id,
          url: result.secure_url,
        });

        // A direct upload is a legacy, seminar-specific signature.
        updates[config.staffIdField] = null;
        updates[config.urlField] = result.secure_url;
        updates[config.publicIdField] = result.public_id;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: true,
        message: "No signature changes were submitted.",
        assets: [],
      });
    }

    const updatedSeminar = await prisma.seminar.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        trainerSignatureStaffId: true,
        trainerSignatureUrl: true,
        trainerSignaturePublicId: true,
        authorizedSignatureStaffId: true,
        authorizedSignatureUrl: true,
        authorizedSignaturePublicId: true,
        trainerSignatureStaff: {
          select: {
            id: true,
            name: true,
            role: true,
            imageUrl: true,
          },
        },
        authorizedSignatureStaff: {
          select: {
            id: true,
            name: true,
            role: true,
            imageUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Certificate signatures updated successfully.",
      assets: uploadedAssets,
      seminar: updatedSeminar,
    });
  } catch (error) {
    console.error("CERTIFICATE SIGNATURE UPDATE ERROR:", error);

    return errorResponse(
      "Something went wrong while updating certificate signatures.",
      500,
    );
  }
}
