import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request, context) {
  try {
    // ---------------------------------------------------------
    // 1. ADMIN AUTHENTICATION
    // ---------------------------------------------------------

    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    // ---------------------------------------------------------
    // 2. GET RESOURCE ID
    // ---------------------------------------------------------

    const { id } = await context.params;

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
    // 3. FIND RESOURCE
    // ---------------------------------------------------------

    const resource = await prisma.resource.findUnique({
      where: {
        id,
      },
      include: {
        seminar: {
          select: {
            id: true,
            title: true,
          },
        },
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
    // 4. CHECK CLOUDINARY URL
    // ---------------------------------------------------------

    if (!resource.cloudinaryUrl) {
      return NextResponse.json(
        {
          error: "Resource file is unavailable",
        },
        {
          status: 404,
        },
      );
    }

    // ---------------------------------------------------------
    // 5. REDIRECT ADMIN TO CLOUDINARY FILE
    // ---------------------------------------------------------

    return NextResponse.redirect(resource.cloudinaryUrl);
  } catch (error) {
    console.error("ADMIN RESOURCE DOWNLOAD ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to open resource",
      },
      {
        status: 500,
      },
    );
  }
}
