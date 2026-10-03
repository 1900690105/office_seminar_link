import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import { makeSlug } from "@/lib/slug";

export const runtime = "nodejs";

/**
 * Maximum lengths used for validation.
 */
const LIMITS = {
  title: 150,
  collegeName: 200,
  speakerName: 150,
  description: 2000,
  program: 200,
  subject: 200,
  duration: 100,
};

/**
 * Convert unknown input into a trimmed string.
 */
function cleanString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

/**
 * Safely parse a date.
 */
function parseDate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Create a unique seminar slug.
 *
 * Example:
 * Full Stack Web Development
 *
 * becomes:
 * full-stack-web-development
 *
 * If that slug already exists:
 *
 * full-stack-web-development-2
 * full-stack-web-development-3
 */
async function createUniqueSlug(title) {
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

    if (!existing) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function POST(request) {
  try {
    // =====================================================
    // 1. ADMIN AUTHENTICATION
    // =====================================================

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

    // =====================================================
    // 2. READ REQUEST BODY
    // =====================================================

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

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 3. CLEAN INPUT
    // =====================================================

    const title = cleanString(body.title);
    const collegeName = cleanString(body.collegeName);
    const speakerName = cleanString(body.speakerName);
    const description = cleanString(body.description);

    const program = cleanString(body.program);
    const subject = cleanString(body.subject);
    const duration = cleanString(body.duration);

    // =====================================================
    // 4. REQUIRED FIELD VALIDATION
    // =====================================================

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

    // =====================================================
    // 5. LENGTH VALIDATION
    // =====================================================

    if (title.length > LIMITS.title) {
      return NextResponse.json(
        {
          success: false,
          error: `Seminar title cannot exceed ${LIMITS.title} characters.`,
        },
        {
          status: 400,
        },
      );
    }

    if (collegeName.length > LIMITS.collegeName) {
      return NextResponse.json(
        {
          success: false,
          error: `College name cannot exceed ${LIMITS.collegeName} characters.`,
        },
        {
          status: 400,
        },
      );
    }

    if (speakerName.length > LIMITS.speakerName) {
      return NextResponse.json(
        {
          success: false,
          error: `Speaker name cannot exceed ${LIMITS.speakerName} characters.`,
        },
        {
          status: 400,
        },
      );
    }

    if (description.length > LIMITS.description) {
      return NextResponse.json(
        {
          success: false,
          error: `Description cannot exceed ${LIMITS.description} characters.`,
        },
        {
          status: 400,
        },
      );
    }

    if (program.length > LIMITS.program) {
      return NextResponse.json(
        {
          success: false,
          error: `Program cannot exceed ${LIMITS.program} characters.`,
        },
        {
          status: 400,
        },
      );
    }

    if (subject.length > LIMITS.subject) {
      return NextResponse.json(
        {
          success: false,
          error: `Subject cannot exceed ${LIMITS.subject} characters.`,
        },
        {
          status: 400,
        },
      );
    }

    if (duration.length > LIMITS.duration) {
      return NextResponse.json(
        {
          success: false,
          error: `Duration cannot exceed ${LIMITS.duration} characters.`,
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 6. SEMINAR DATE
    // =====================================================

    const seminarDate = parseDate(body.seminarDate);

    if (!seminarDate) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid seminar date is required.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // 7. GENERATE UNIQUE SLUG
    // =====================================================

    const slug = await createUniqueSlug(title);

    // =====================================================
    // 8. CREATE SEMINAR
    // =====================================================

    const seminar = await prisma.seminar.create({
      data: {
        title,
        slug,

        collegeName,

        speakerName: speakerName || null,

        description: description || null,

        seminarDate,

        // New seminars remain draft until
        // the admin explicitly publishes them.
        status: "DRAFT",

        // =================================================
        // CERTIFICATE CONFIGURATION
        // =================================================

        program: program || null,

        subject: subject || null,

        duration: duration || null,

        trainerSignatureUrl: cleanString(body.trainerSignatureUrl) || null,

        trainerSignaturePublicId:
          cleanString(body.trainerSignaturePublicId) || null,

        authorizedSignatureUrl:
          cleanString(body.authorizedSignatureUrl) || null,

        authorizedSignaturePublicId:
          cleanString(body.authorizedSignaturePublicId) || null,
      },

      select: {
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

        trainerSignatureUrl: true,
        trainerSignaturePublicId: true,

        authorizedSignatureUrl: true,
        authorizedSignaturePublicId: true,

        createdAt: true,
        updatedAt: true,
      },
    });

    // =====================================================
    // 9. SUCCESS RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: true,
        message: "Seminar created successfully.",
        seminar,
        id: seminar.id,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("CREATE SEMINAR ERROR:", error);

    // =====================================================
    // PRISMA UNIQUE CONSTRAINT
    // =====================================================

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

    // =====================================================
    // GENERIC ERROR
    // =====================================================

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create seminar. Please try again.",
      },
      {
        status: 500,
      },
    );
  }
}
