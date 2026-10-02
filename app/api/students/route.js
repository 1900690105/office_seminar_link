import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const seminarId = searchParams.get("seminarId") || "";
    const page = Math.max(
      Number.parseInt(searchParams.get("page") || "1", 10),
      1,
    );

    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
      100,
    );

    const skip = (page - 1) * limit;

    const where = {
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                phone: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),

      ...(seminarId
        ? {
            registrations: {
              some: {
                seminarId,
              },
            },
          }
        : {}),
    };

    const [students, total, seminars] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
        include: {
          registrations: {
            orderBy: {
              registeredAt: "desc",
            },
            include: {
              seminar: {
                select: {
                  id: true,
                  title: true,
                  collegeName: true,
                  seminarDate: true,
                },
              },
            },
          },
        },
      }),

      prisma.student.count({
        where,
      }),

      prisma.seminar.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          collegeName: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      students,
      seminars,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("STUDENTS GET ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to load students",
      },
      {
        status: 500,
      },
    );
  }
}
