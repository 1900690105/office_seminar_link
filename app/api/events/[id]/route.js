import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { makeSlug } from "@/lib/slug";

export const runtime = "nodejs";

// ============================================================
// HELPERS
// ============================================================

function cleanString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function isValidDate(value) {
  if (!value) return false;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

async function generateUniqueSlug(title, currentId) {
  const baseSlug = makeSlug(title);

  if (!baseSlug) {
    throw new Error("Unable to generate seminar slug.");
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.seminar.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    // No seminar uses this slug
    if (!existing) {
      return slug;
    }

    // Current seminar already owns this slug
    if (existing.id === currentId) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;

    // Safety protection
    if (counter > 1000) {
      throw new Error("Unable to generate a unique seminar slug.");
    }
  }
}

// ============================================================
// GET SEMINAR
// ============================================================

export async function GET(request, ctx) {
  try {
    // --------------------------------------------------------
    // AUTH
    // --------------------------------------------------------

    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    // --------------------------------------------------------
    // PARAMS
    // --------------------------------------------------------

    const { id } = await ctx.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Seminar ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------------
    // DATABASE
    // --------------------------------------------------------

    const seminar = await prisma.seminar.findUnique({
      where: {
        id,
      },
      include: {
        resources: {
          orderBy: {
            createdAt: "asc",
          },
        },

        _count: {
          select: {
            registrations: true,
            resources: true,
          },
        },
      },
    });

    if (!seminar) {
      return NextResponse.json(
        {
          success: false,
          error: "Seminar not found.",
        },
        {
          status: 404,
        },
      );
    }

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        seminar,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("GET SEMINAR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load seminar.",
      },
      {
        status: 500,
      },
    );
  }
}

// ============================================================
// UPDATE SEMINAR
// ============================================================

export async function PATCH(request, ctx) {
  try {
    // --------------------------------------------------------
    // AUTH
    // --------------------------------------------------------

    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    // --------------------------------------------------------
    // PARAMS
    // --------------------------------------------------------

    const { id } = await ctx.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Seminar ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------------
    // CHECK SEMINAR
    // --------------------------------------------------------

    const existingSeminar = await prisma.seminar.findUnique({
      where: {
        id,
      },
    });

    if (!existingSeminar) {
      return NextResponse.json(
        {
          success: false,
          error: "Seminar not found.",
        },
        {
          status: 404,
        },
      );
    }

    // --------------------------------------------------------
    // BODY
    // --------------------------------------------------------

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------------
    // CLEAN VALUES
    // --------------------------------------------------------

    const title = cleanString(body.title);
    const collegeName = cleanString(body.collegeName);
    const speakerName = cleanString(body.speakerName);
    const description = cleanString(body.description);

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "Seminar title is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (title.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Seminar title must contain at least 3 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (title.length > 150) {
      return NextResponse.json(
        {
          success: false,
          error: "Seminar title cannot exceed 150 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (!collegeName) {
      return NextResponse.json(
        {
          success: false,
          error: "College name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (collegeName.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid college name.",
        },
        {
          status: 400,
        },
      );
    }

    if (collegeName.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: "College name cannot exceed 200 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (speakerName.length > 150) {
      return NextResponse.json(
        {
          success: false,
          error: "Speaker name cannot exceed 150 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (description.length > 2000) {
      return NextResponse.json(
        {
          success: false,
          error: "Description cannot exceed 2000 characters.",
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------------
    // DATE
    // --------------------------------------------------------

    let seminarDate = existingSeminar.seminarDate;

    if (body.seminarDate !== undefined) {
      if (!body.seminarDate) {
        return NextResponse.json(
          {
            success: false,
            error: "Seminar date is required.",
          },
          {
            status: 400,
          },
        );
      }

      if (!isValidDate(body.seminarDate)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid seminar date.",
          },
          {
            status: 400,
          },
        );
      }

      seminarDate = new Date(body.seminarDate);
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const allowedStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];

    let status = existingSeminar.status;

    if (body.status !== undefined) {
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid seminar status.",
          },
          {
            status: 400,
          },
        );
      }

      status = body.status;
    }

    // --------------------------------------------------------
    // SLUG
    // --------------------------------------------------------
    //
    // If title changes, create a new unique slug.
    //
    // If title does not change, keep the current slug.
    // --------------------------------------------------------

    let slug = existingSeminar.slug;

    if (title !== existingSeminar.title) {
      slug = await generateUniqueSlug(title, id);
    }

    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    const updatedSeminar = await prisma.seminar.update({
      where: {
        id,
      },

      data: {
        title,
        slug,
        collegeName,
        speakerName: speakerName || null,
        description: description || null,
        seminarDate,
        status,
      },

      include: {
        resources: {
          orderBy: {
            createdAt: "asc",
          },
        },

        _count: {
          select: {
            registrations: true,
            resources: true,
          },
        },
      },
    });

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: "Seminar updated successfully.",
        seminar: updatedSeminar,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("UPDATE SEMINAR ERROR:", error);

    // Prisma unique constraint
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: "A seminar with this information already exists.",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update seminar.",
      },
      {
        status: 500,
      },
    );
  }
}

// ============================================================
// DELETE SEMINAR
// ============================================================

export async function DELETE(request, ctx) {
  try {
    // --------------------------------------------------------
    // AUTH
    // --------------------------------------------------------

    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    // --------------------------------------------------------
    // PARAMS
    // --------------------------------------------------------

    const { id } = await ctx.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Seminar ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    // --------------------------------------------------------
    // LOAD SEMINAR + RESOURCES
    // --------------------------------------------------------

    const seminar = await prisma.seminar.findUnique({
      where: {
        id,
      },

      include: {
        resources: {
          select: {
            id: true,
            publicId: true,
            cloudinaryUrl: true,
            fileName: true,
          },
        },
      },
    });

    if (!seminar) {
      return NextResponse.json(
        {
          success: false,
          error: "Seminar not found.",
        },
        {
          status: 404,
        },
      );
    }

    // --------------------------------------------------------
    // DELETE CLOUDINARY RESOURCES
    // --------------------------------------------------------
    //
    // IMPORTANT:
    // We delete ONLY files belonging to this seminar.
    //
    // Students are NOT touched.
    //
    // Registrations will be deleted automatically by Prisma
    // because your schema has:
    //
    // seminar Seminar @relation(
    //   fields: [seminarId],
    //   references: [id],
    //   onDelete: Cascade
    // )
    //
    // Student records remain in the Student table.
    // --------------------------------------------------------

    const cloudinaryResults = [];

    for (const resource of seminar.resources) {
      if (!resource.publicId) {
        cloudinaryResults.push({
          resourceId: resource.id,
          success: false,
          status: "NO_PUBLIC_ID",
        });

        continue;
      }

      try {
        const result = await cloudinary.uploader.destroy(resource.publicId, {
          resource_type: "raw",
          type: "upload",
          invalidate: true,
        });

        cloudinaryResults.push({
          resourceId: resource.id,
          publicId: resource.publicId,
          success: true,
          result: result?.result || "unknown",
        });

        console.log("CLOUDINARY DELETE:", {
          resourceId: resource.id,
          publicId: resource.publicId,
          result: result?.result,
        });
      } catch (cloudinaryError) {
        console.error("CLOUDINARY DELETE ERROR:", {
          resourceId: resource.id,
          publicId: resource.publicId,
          error: cloudinaryError,
        });

        cloudinaryResults.push({
          resourceId: resource.id,
          publicId: resource.publicId,
          success: false,
          status: "CLOUDINARY_DELETE_FAILED",
        });
      }
    }

    // --------------------------------------------------------
    // DELETE DATABASE RECORD
    // --------------------------------------------------------
    //
    // This deletes:
    //
    // Seminar
    // ├── Resources
    // └── Registrations
    //
    // BUT NOT:
    //
    // Student
    //
    // because Registration -> Student is separate.
    // --------------------------------------------------------

    await prisma.seminar.delete({
      where: {
        id,
      },
    });

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        message: "Seminar deleted successfully.",

        seminarId: id,

        resourcesDeleted: seminar.resources.length,

        cloudinary: cloudinaryResults,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("DELETE SEMINAR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete seminar.",
      },
      {
        status: 500,
      },
    );
  }
}
