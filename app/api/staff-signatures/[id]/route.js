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

function errorResponse(error, status) {
  return NextResponse.json(
    { success: false, error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

const signatureSelect = {
  id: true,
  name: true,
  role: true,
  imageUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

async function getSignatureId(params) {
  const resolvedParams = await params;
  return resolvedParams?.id;
}

// GET /api/staff-signatures/[id]
export async function GET(request, { params }) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return errorResponse("Unauthorized.", 401);
    }

    const id = await getSignatureId(params);

    if (!id) {
      return errorResponse("Staff signature ID is required.", 400);
    }

    const signature = await prisma.staffSignature.findUnique({
      where: { id },
      select: signatureSelect,
    });

    if (!signature) {
      return errorResponse("Staff signature not found.", 404);
    }

    return NextResponse.json(
      { success: true, signature },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("STAFF SIGNATURE GET ERROR:", error);

    return errorResponse("Unable to load the staff signature.", 500);
  }
}

// PATCH /api/staff-signatures/[id]
// Update the name, role, or active status.
export async function PATCH(request, { params }) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return errorResponse("Unauthorized.", 401);
    }

    const id = await getSignatureId(params);

    if (!id) {
      return errorResponse("Staff signature ID is required.", 400);
    }

    const existing = await prisma.staffSignature.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return errorResponse("Staff signature not found.", 404);
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Request body must be valid JSON.", 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("Invalid request body.", 400);
    }

    const allowedFields = new Set(["name", "role", "isActive"]);
    const submittedFields = Object.keys(body);

    if (
      submittedFields.length === 0 ||
      submittedFields.some((field) => !allowedFields.has(field))
    ) {
      return errorResponse("Provide only name, role, or isActive.", 400);
    }

    const data = {};

    if (Object.hasOwn(body, "name")) {
      if (typeof body.name !== "string") {
        return errorResponse("Name must be a string.", 400);
      }

      const name = body.name.trim();

      if (!name || name.length > 100) {
        return errorResponse(
          "Name is required and must be at most 100 characters.",
          400,
        );
      }

      const duplicate = await prisma.staffSignature.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: "insensitive" },
        },
        select: { id: true },
      });

      if (duplicate) {
        return errorResponse(
          "Another staff signature already uses this name.",
          409,
        );
      }

      data.name = name;
    }

    if (Object.hasOwn(body, "role")) {
      if (body.role !== null && typeof body.role !== "string") {
        return errorResponse("Role must be a string or null.", 400);
      }

      const role = typeof body.role === "string" ? body.role.trim() : "";

      if (role.length > 100) {
        return errorResponse("Role must be at most 100 characters.", 400);
      }

      data.role = role || null;
    }

    if (Object.hasOwn(body, "isActive")) {
      if (typeof body.isActive !== "boolean") {
        return errorResponse("isActive must be true or false.", 400);
      }

      data.isActive = body.isActive;
    }

    const signature = await prisma.staffSignature.update({
      where: { id },
      data,
      select: signatureSelect,
    });

    return NextResponse.json({
      success: true,
      message: "Staff signature updated successfully.",
      signature,
    });
  } catch (error) {
    console.error("STAFF SIGNATURE UPDATE ERROR:", error);

    return errorResponse("Unable to update the staff signature.", 500);
  }
}

// DELETE /api/staff-signatures/[id]
// Only delete signatures that are not referenced by any seminar.
export async function DELETE(request, { params }) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return errorResponse("Unauthorized.", 401);
    }

    const id = await getSignatureId(params);

    if (!id) {
      return errorResponse("Staff signature ID is required.", 400);
    }

    const signature = await prisma.staffSignature.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        publicId: true,
      },
    });

    if (!signature) {
      return errorResponse("Staff signature not found.", 404);
    }

    const [trainerUsage, authorizedUsage] = await Promise.all([
      prisma.seminar.count({
        where: { trainerSignatureStaffId: id },
      }),
      prisma.seminar.count({
        where: { authorizedSignatureStaffId: id },
      }),
    ]);

    if (trainerUsage > 0 || authorizedUsage > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This signature is assigned to one or more seminars. Deactivate it instead to preserve existing certificates.",
          usage: {
            trainerSeminars: trainerUsage,
            authorizedSeminars: authorizedUsage,
          },
        },
        { status: 409 },
      );
    }

    // Delete the database record first. Only remove a Cloudinary
    // asset when it has an actual public ID.
    await prisma.staffSignature.delete({
      where: { id },
    });

    let cloudinaryCleanup = "not_needed";

    if (signature.publicId) {
      try {
        const result = await cloudinary.uploader.destroy(signature.publicId, {
          resource_type: "image",
          type: "upload",
        });

        cloudinaryCleanup =
          result.result === "ok" || result.result === "not found"
            ? "completed"
            : "needs_review";

        if (cloudinaryCleanup === "needs_review") {
          console.error("STAFF SIGNATURE CLOUDINARY CLEANUP RESULT:", result);
        }
      } catch (cleanupError) {
        cloudinaryCleanup = "needs_review";

        console.error(
          "STAFF SIGNATURE CLOUDINARY CLEANUP ERROR:",
          cleanupError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Staff signature record deleted.",
      cloudinaryCleanup,
    });
  } catch (error) {
    console.error("STAFF SIGNATURE DELETE ERROR:", error);

    return errorResponse("Unable to delete the staff signature.", 500);
  }
}
