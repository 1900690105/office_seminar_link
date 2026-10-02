import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_, ctx) {
  try {
    const { slug } = await ctx.params;

    if (!slug) {
      return NextResponse.json(
        {
          error: "Seminar slug is required",
        },
        {
          status: 400,
        },
      );
    }

    const seminar = await prisma.seminar.findUnique({
      where: {
        slug,
      },
      include: {
        resources: {
          orderBy: {
            createdAt: "asc",
          },
        },
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

    return NextResponse.json(
      {
        id: seminar.id,
        title: seminar.title,
        slug: seminar.slug,
        description: seminar.description,
        date: seminar.date,
        venue: seminar.venue,

        resources: seminar.resources.map((resource) => ({
          id: resource.id,
          title: resource.title,
          fileName: resource.fileName,
          fileType: resource.fileType,
          bytes: resource.bytes,
        })),
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("PUBLIC SEMINAR API ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to load seminar",
      },
      {
        status: 500,
      },
    );
  }
}
