import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { makeSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const EVENT_TYPES = ["SEMINAR", "WORKSHOP"];
const LIMITS = {
  title: 150,
  collegeName: 200,
  speakerName: 150,
  description: 2000,
  program: 200,
  subject: 200,
  duration: 100,
};

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  // The form sends YYYY-MM-DD. Parse it consistently as a calendar date
  // instead of relying on the server's local timezone.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function errorResponse(error, status = 400) {
  return NextResponse.json(
    { success: false, error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

async function createUniqueSlug(title) {
  const baseSlug = makeSlug(title);

  if (!baseSlug) {
    throw new Error("Unable to generate seminar slug.");
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.seminar.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function POST(request) {
  try {
    // 1. Authenticate administrator.
    const admin = await getAdmin();

    if (!admin) {
      return errorResponse("Unauthorized.", 401);
    }

    // 2. Parse request.
    let body;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON request body.", 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("Invalid request data.", 400);
    }

    // 3. Clean text inputs.
    const title = cleanString(body.title);
    const collegeName = cleanString(body.collegeName);
    const speakerName = cleanString(body.speakerName);
    const description = cleanString(body.description);
    const program = cleanString(body.program);
    const subject = cleanString(body.subject);
    const duration = cleanString(body.duration);

    const trainerStaffId = cleanString(body.trainerSignatureStaffId);
    const authorizedStaffId = cleanString(body.authorizedSignatureStaffId);

    const eventType = cleanString(body.eventType || "SEMINAR").toUpperCase();

    if (!EVENT_TYPES.includes(eventType)) {
      return errorResponse(
        "Invalid event type. Choose SEMINAR or WORKSHOP.",
        400,
      );
    }

    // 4. Required fields.
    if (!title || title.length < 3) {
      return errorResponse(
        "Seminar title must contain at least 3 characters.",
        400,
      );
    }

    if (!collegeName || collegeName.length < 2) {
      return errorResponse("Please provide a valid college name.", 400);
    }

    // 5. Length limits.
    const fields = [
      ["title", title, LIMITS.title],
      ["college name", collegeName, LIMITS.collegeName],
      ["speaker name", speakerName, LIMITS.speakerName],
      ["description", description, LIMITS.description],
      ["program", program, LIMITS.program],
      ["subject", subject, LIMITS.subject],
      ["duration", duration, LIMITS.duration],
    ];

    for (const [label, value, limit] of fields) {
      if (value.length > limit) {
        return errorResponse(
          `${label.charAt(0).toUpperCase() + label.slice(1)} cannot exceed ${limit} characters.`,
          400,
        );
      }
    }

    // 6. Validate seminar date.
    const seminarDate = parseDate(body.seminarDate);

    if (!seminarDate) {
      return errorResponse("A valid seminar date is required.", 400);
    }

    // 7. Validate selected reusable signatures.
    // Only active entries in the library may be selected for new seminars.
    const selectedIds = [
      ...new Set([trainerStaffId, authorizedStaffId].filter(Boolean)),
    ];

    let staffSignatures = [];

    if (selectedIds.length > 0) {
      staffSignatures = await prisma.staffSignature.findMany({
        where: {
          id: { in: selectedIds },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          publicId: true,
        },
      });

      const foundIds = new Set(
        staffSignatures.map((signature) => signature.id),
      );

      const invalidIds = selectedIds.filter((id) => !foundIds.has(id));

      if (invalidIds.length > 0) {
        return errorResponse(
          "One or more selected staff signatures do not exist or are inactive. Refresh the signature library and try again.",
          400,
        );
      }
    }

    const trainerStaff = trainerStaffId
      ? staffSignatures.find((signature) => signature.id === trainerStaffId)
      : null;

    const authorizedStaff = authorizedStaffId
      ? staffSignatures.find((signature) => signature.id === authorizedStaffId)
      : null;

    // 8. Generate unique slug.
    const slug = await createUniqueSlug(title);

    // 9. Create seminar with selected staff signatures.
    // If a reusable signature is selected, its stored image details take
    // precedence over legacy signature URL values from older clients.
    const seminar = await prisma.seminar.create({
      data: {
        eventType,
        title,
        slug,
        collegeName,
        speakerName: speakerName || null,
        description: description || null,
        seminarDate,
        status: "DRAFT",

        program: program || null,
        subject: subject || null,
        duration: duration || null,

        trainerSignatureStaffId: trainerStaff?.id ?? null,
        trainerSignatureUrl:
          trainerStaff?.imageUrl ??
          (cleanString(body.trainerSignatureUrl) || null),
        trainerSignaturePublicId:
          trainerStaff?.publicId ??
          (cleanString(body.trainerSignaturePublicId) || null),

        authorizedSignatureStaffId: authorizedStaff?.id ?? null,
        authorizedSignatureUrl:
          authorizedStaff?.imageUrl ??
          (cleanString(body.authorizedSignatureUrl) || null),
        authorizedSignaturePublicId:
          authorizedStaff?.publicId ??
          (cleanString(body.authorizedSignaturePublicId) || null),
      },
      select: {
        eventType: true,
        id: true,
        title: true,
        slug: true,
        description: true,
        collegeName: true,
        speakerName: true,
        seminarDate: true,
        status: true,

        program: true,
        subject: true,
        duration: true,

        trainerSignatureStaffId: true,
        trainerSignatureUrl: true,
        trainerSignaturePublicId: true,

        authorizedSignatureStaffId: true,
        authorizedSignatureUrl: true,
        authorizedSignaturePublicId: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `${eventType === "WORKSHOP" ? "Workshop" : "Seminar"} created successfully.`,
        seminar,
        id: seminar.id,
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("CREATE SEMINAR ERROR:", error);

    if (error?.code === "P2002") {
      return errorResponse(
        "A seminar with this slug already exists. Please try again.",
        409,
      );
    }

    return errorResponse("Unable to create seminar. Please try again.", 500);
  }
}
