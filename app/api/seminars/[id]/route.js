import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

// =========================================================
// GET SEMINAR
// =========================================================

export async function GET(request, ctx) {
  try {
    const admin = await getAdmin();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json(
        { error: "Seminar ID is required" },
        { status: 400 },
      );
    }

    const seminar = await prisma.seminar.findUnique({
      where: {
        id,
      },
      include: {
        resources: true,
        _count: {
          select: {
            registrations: true,
            resources: true,
          },
        },
      },
    });

    if (!seminar) {
      return NextResponse.json({ error: "Seminar not found" }, { status: 404 });
    }

    return NextResponse.json(seminar);
  } catch (error) {
    console.error("GET SEMINAR ERROR:", error);

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

// =========================================================
// DELETE SEMINAR
// =========================================================

export async function DELETE(request, ctx) {
  try {
    // -----------------------------------------------------
    // 1. AUTHENTICATION
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // 2. SEMINAR ID
    // -----------------------------------------------------

    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Seminar ID is required",
        },
        {
          status: 400,
        },
      );
    }

    console.log("");
    console.log("==========================================");
    console.log("DELETE SEMINAR START");
    console.log("==========================================");
    console.log("Seminar ID:", id);

    // -----------------------------------------------------
    // 3. GET SEMINAR + RESOURCES
    // -----------------------------------------------------

    const seminar = await prisma.seminar.findUnique({
      where: {
        id,
      },

      include: {
        resources: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            publicId: true,
            cloudinaryUrl: true,
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
          error: "Seminar not found",
        },
        {
          status: 404,
        },
      );
    }

    console.log("Resources:", seminar.resources.length);

    // -----------------------------------------------------
    // 4. DELETE EACH CLOUDINARY RESOURCE
    // -----------------------------------------------------

    const cloudinaryResults = [];

    for (const resource of seminar.resources) {
      const publicId = resource.publicId;

      console.log("");
      console.log("------------------------------------------");
      console.log("Deleting resource");
      console.log("File:", resource.fileName);
      console.log("Public ID:", publicId);
      console.log("------------------------------------------");

      if (!publicId) {
        cloudinaryResults.push({
          resourceId: resource.id,
          fileName: resource.fileName,
          success: false,
          reason: "Missing Cloudinary publicId",
        });

        continue;
      }

      let deleted = false;
      let deleteResult = null;

      // ---------------------------------------------------
      // TRY RAW
      // ---------------------------------------------------

      try {
        console.log("Trying resource_type: raw");

        deleteResult = await cloudinary.api.delete_resources([publicId], {
          resource_type: "raw",
          type: "upload",
          invalidate: true,
        });

        console.log(
          "RAW DELETE RESULT:",
          JSON.stringify(deleteResult, null, 2),
        );

        const status = deleteResult?.deleted?.[publicId];

        if (status === "deleted" || status === "not_found") {
          deleted = true;
        }
      } catch (error) {
        console.error("RAW DELETE ERROR:", error?.message);
      }

      // ---------------------------------------------------
      // TRY IMAGE IF RAW DID NOT DELETE
      // ---------------------------------------------------

      if (!deleted) {
        try {
          console.log("Trying resource_type: image");

          deleteResult = await cloudinary.api.delete_resources([publicId], {
            resource_type: "image",
            type: "upload",
            invalidate: true,
          });

          console.log(
            "IMAGE DELETE RESULT:",
            JSON.stringify(deleteResult, null, 2),
          );

          const status = deleteResult?.deleted?.[publicId];

          if (status === "deleted" || status === "not_found") {
            deleted = true;
          }
        } catch (error) {
          console.error("IMAGE DELETE ERROR:", error?.message);
        }
      }

      // ---------------------------------------------------
      // TRY VIDEO IF STILL NOT DELETED
      // ---------------------------------------------------

      if (!deleted) {
        try {
          console.log("Trying resource_type: video");

          deleteResult = await cloudinary.api.delete_resources([publicId], {
            resource_type: "video",
            type: "upload",
            invalidate: true,
          });

          console.log(
            "VIDEO DELETE RESULT:",
            JSON.stringify(deleteResult, null, 2),
          );

          const status = deleteResult?.deleted?.[publicId];

          if (status === "deleted" || status === "not_found") {
            deleted = true;
          }
        } catch (error) {
          console.error("VIDEO DELETE ERROR:", error?.message);
        }
      }

      // ---------------------------------------------------
      // SAVE RESULT
      // ---------------------------------------------------

      cloudinaryResults.push({
        resourceId: resource.id,
        fileName: resource.fileName,
        publicId,
        success: deleted,
        result: deleteResult,
      });

      // ---------------------------------------------------
      // STOP DATABASE DELETION IF ACTUAL FAILURE
      // ---------------------------------------------------

      if (!deleted) {
        console.error("CLOUDINARY RESOURCE COULD NOT BE DELETED:");

        console.error(publicId);

        return NextResponse.json(
          {
            success: false,

            error:
              "A Cloudinary resource could not be deleted. The seminar was NOT deleted from the database.",

            resource: {
              id: resource.id,
              fileName: resource.fileName,
              publicId: resource.publicId,
            },

            cloudinaryResults,
          },
          {
            status: 500,
          },
        );
      }
    }

    // -----------------------------------------------------
    // 5. ALL CLOUDINARY FILES SUCCESSFULLY HANDLED
    // -----------------------------------------------------

    console.log("");
    console.log("All Cloudinary resources processed successfully.");

    // -----------------------------------------------------
    // 6. DELETE SEMINAR
    // -----------------------------------------------------

    await prisma.seminar.delete({
      where: {
        id,
      },
    });

    console.log("Seminar deleted from PostgreSQL.");

    console.log("Student records were preserved.");

    console.log("==========================================");
    console.log("DELETE SEMINAR COMPLETE");
    console.log("==========================================");

    // -----------------------------------------------------
    // 7. SUCCESS RESPONSE
    // -----------------------------------------------------

    return NextResponse.json({
      success: true,

      message: "Seminar deleted successfully.",

      deleted: {
        seminarId: seminar.id,

        resources: seminar.resources.length,

        registrations: seminar._count.registrations,

        students: "Student records preserved",
      },

      cloudinary: cloudinaryResults,
    });
  } catch (error) {
    console.error("");
    console.error("==========================================");
    console.error("DELETE SEMINAR ERROR");
    console.error("==========================================");
    console.error(error);

    return NextResponse.json(
      {
        success: false,

        error: error?.message || "Failed to delete seminar",
      },
      {
        status: error?.http_code || 500,
      },
    );
  }
}
