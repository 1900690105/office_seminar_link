import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();

    const { name, phone, slug } = body;

    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (!name || !phone || !slug) {
      return NextResponse.json(
        {
          error: "Name, phone number and seminar are required.",
        },
        { status: 400 },
      );
    }

    const cleanName = String(name).trim();
    const cleanPhone = String(phone).trim();
    const cleanSlug = String(slug).trim();

    if (cleanName.length < 2) {
      return NextResponse.json(
        {
          error: "Please enter a valid name.",
        },
        { status: 400 },
      );
    }

    if (cleanPhone.length < 7) {
      return NextResponse.json(
        {
          error: "Please enter a valid phone number.",
        },
        { status: 400 },
      );
    }

    // -----------------------------
    // FIND SEMINAR
    // -----------------------------

    const seminar = await prisma.seminar.findUnique({
      where: {
        slug: cleanSlug,
      },
    });

    if (!seminar) {
      return NextResponse.json(
        {
          error: "Seminar unavailable.",
        },
        { status: 404 },
      );
    }

    // -----------------------------
    // FIND STUDENT BY PHONE
    // -----------------------------

    let student = await prisma.student.findFirst({
      where: {
        phone: cleanPhone,
      },
    });

    // -----------------------------
    // CREATE STUDENT
    // -----------------------------

    if (!student) {
      student = await prisma.student.create({
        data: {
          name: cleanName,
          phone: cleanPhone,
        },
      });
    } else {
      // Optional:
      // Keep the student's latest name updated.
      if (student.name !== cleanName) {
        student = await prisma.student.update({
          where: {
            id: student.id,
          },
          data: {
            name: cleanName,
          },
        });
      }
    }

    // -----------------------------
    // CHECK EXISTING REGISTRATION
    // -----------------------------

    const existingRegistration = await prisma.registration.findUnique({
      where: {
        studentId_seminarId: {
          studentId: student.id,
          seminarId: seminar.id,
        },
      },
    });

    if (existingRegistration) {
      return NextResponse.json(
        {
          success: true,
          alreadyRegistered: true,
          registrationId: existingRegistration.id,
          accessToken: existingRegistration.accessToken,
        },
        { status: 200 },
      );
    }

    // -----------------------------
    // CREATE ACCESS TOKEN
    // -----------------------------

    const accessToken = crypto.randomBytes(32).toString("hex");

    // -----------------------------
    // CREATE REGISTRATION
    // -----------------------------

    const registration = await prisma.registration.create({
      data: {
        accessToken,

        student: {
          connect: {
            id: student.id,
          },
        },

        seminar: {
          connect: {
            id: seminar.id,
          },
        },
      },
    });

    // -----------------------------
    // RESPONSE
    // -----------------------------

    return NextResponse.json(
      {
        success: true,
        alreadyRegistered: false,
        registrationId: registration.id,
        accessToken: registration.accessToken,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("REGISTRATION ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to register for seminar.",
      },
      { status: 500 },
    );
  }
}
