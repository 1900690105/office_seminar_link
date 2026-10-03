import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, ctx) {
  try {
    const { slug } = await ctx.params;

    // =====================================================
    // VALIDATE SLUG
    // =====================================================

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Seminar slug is required",
        },
        {
          status: 400,
        },
      );
    }

    const cleanSlug = slug.trim().toLowerCase();

    // =====================================================
    // FIND PUBLISHED SEMINAR
    // =====================================================

    const seminar = await prisma.seminar.findFirst({
      where: {
        slug: cleanSlug,
        status: "DRAFT",
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

        resources: {
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            title: true,
            fileName: true,
            fileType: true,
            bytes: true,
            createdAt: true,
          },
        },
      },
    });

    // =====================================================
    // SEMINAR NOT AVAILABLE
    // =====================================================

    if (!seminar) {
      return NextResponse.json(
        {
          success: false,
          error: "This seminar is not currently available.",
        },
        {
          status: 404,
        },
      );
    }

    // =====================================================
    // PUBLIC RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: true,

        seminar: {
          id: seminar.id,
          title: seminar.title,
          slug: seminar.slug,
          description: seminar.description,
          collegeName: seminar.collegeName,
          speakerName: seminar.speakerName,
          seminarDate: seminar.seminarDate,
          status: seminar.status,

          resources: seminar.resources.map((resource) => ({
            id: resource.id,
            title: resource.title,
            fileName: resource.fileName,
            fileType: resource.fileType,
            bytes: resource.bytes,
            createdAt: resource.createdAt,
          })),
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("PUBLIC SEMINAR API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load seminar",
      },
      {
        status: 500,
      },
    );
  }
}
