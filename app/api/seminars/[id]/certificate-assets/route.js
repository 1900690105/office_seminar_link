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

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

/*
|--------------------------------------------------------------------------
| Certificate asset configuration
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Prisma fields are:
|
| trainerSignatureUrl
| trainerSignaturePublicId
| stampUrl
| stampPublicId
| authorizedSignatureUrl
| authorizedSignaturePublicId
|
*/

const ASSET_CONFIG = {
  trainerSignature: {
    urlField: "trainerSignatureUrl",
    publicIdField: "trainerSignaturePublicId",
    folder: "seminars/certificates/signatures",
  },

  certificateStamp: {
    // IMPORTANT:
    // Database field is stampUrl
    urlField: "stampUrl",
    publicIdField: "stampPublicId",
    folder: "seminars/certificates/stamps",
  },

  authorizedSignature: {
    urlField: "authorizedSignatureUrl",
    publicIdField: "authorizedSignaturePublicId",
    folder: "seminars/certificates/signatures",
  },
};

/*
|--------------------------------------------------------------------------
| Upload buffer to Cloudinary
|--------------------------------------------------------------------------
*/

function uploadToCloudinary(buffer, folder, originalName) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        type: "upload",
        use_filename: false,
        unique_filename: true,
        overwrite: false,

        context: {
          original_name: originalName,
        },
      },

      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(req, { params }) {
  try {
    /*
    |--------------------------------------------------------------------------
    | ADMIN AUTH
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | SEMINAR ID
    |--------------------------------------------------------------------------
    */

    const { id } = await params;

    if (!id) {
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

    /*
    |--------------------------------------------------------------------------
    | FIND SEMINAR
    |--------------------------------------------------------------------------
    */

    const seminar = await prisma.seminar.findUnique({
      where: {
        id,
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

    /*
    |--------------------------------------------------------------------------
    | FORM DATA
    |--------------------------------------------------------------------------
    */

    const formData = await req.formData();

    /*
    |--------------------------------------------------------------------------
    | DATABASE UPDATES
    |--------------------------------------------------------------------------
    */

    const updates = {};

    const uploadedAssets = [];

    /*
    |--------------------------------------------------------------------------
    | PROCESS EACH CERTIFICATE ASSET
    |--------------------------------------------------------------------------
    */

    for (const [fieldName, config] of Object.entries(ASSET_CONFIG)) {
      const file = formData.get(fieldName);

      /*
      |--------------------------------------------------------------------------
      | OPTIONAL ASSET
      |--------------------------------------------------------------------------
      */

      if (!file || typeof file === "string") {
        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE MIME TYPE
      |--------------------------------------------------------------------------
      */

      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `${fieldName} must be PNG, JPG, JPEG or WEBP.`,
          },
          {
            status: 400,
          },
        );
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE FILE SIZE
      |--------------------------------------------------------------------------
      */

      if (file.size <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `${fieldName} is empty.`,
          },
          {
            status: 400,
          },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `${fieldName} cannot exceed 5 MB.`,
          },
          {
            status: 400,
          },
        );
      }

      /*
      |--------------------------------------------------------------------------
      | CONVERT FILE TO BUFFER
      |--------------------------------------------------------------------------
      */

      const buffer = Buffer.from(await file.arrayBuffer());

      /*
      |--------------------------------------------------------------------------
      | UPLOAD TO CLOUDINARY
      |--------------------------------------------------------------------------
      */

      const result = await uploadToCloudinary(buffer, config.folder, file.name);

      if (!result?.secure_url || !result?.public_id) {
        throw new Error(`Cloudinary upload failed for ${fieldName}.`);
      }

      /*
      |--------------------------------------------------------------------------
      | ADD ONLY THE UPLOADED FIELDS TO PRISMA UPDATE
      |--------------------------------------------------------------------------
      */

      updates[config.urlField] = result.secure_url;

      updates[config.publicIdField] = result.public_id;

      /*
      |--------------------------------------------------------------------------
      | RESPONSE DATA
      |--------------------------------------------------------------------------
      */

      uploadedAssets.push({
        fieldName,

        url: result.secure_url,

        publicId: result.public_id,

        originalName: file.name,

        type: file.type,

        size: file.size,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | NOTHING UPLOADED
    |--------------------------------------------------------------------------
    */

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: true,

          message: "No certificate assets were uploaded.",

          assets: [],

          seminar: {
            id: seminar.id,

            trainerSignatureUrl: seminar.trainerSignatureUrl || null,

            trainerSignaturePublicId: seminar.trainerSignaturePublicId || null,

            stampUrl: seminar.stampUrl || null,

            stampPublicId: seminar.stampPublicId || null,

            authorizedSignatureUrl: seminar.authorizedSignatureUrl || null,

            authorizedSignaturePublicId:
              seminar.authorizedSignaturePublicId || null,
          },
        },
        {
          status: 200,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE PRISMA
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | We use `updates` directly.
    |
    | This prevents:
    |
    | trainerSignatureUrl = undefined
    | certificateStampUrl = undefined
    | etc.
    |
    | It also prevents existing certificate assets from being
    | accidentally replaced with null.
    |
    */

    const updatedSeminar = await prisma.seminar.update({
      where: {
        id,
      },

      data: updates,

      select: {
        id: true,

        trainerSignatureUrl: true,
        trainerSignaturePublicId: true,

        stampUrl: true,
        stampPublicId: true,

        authorizedSignatureUrl: true,
        authorizedSignaturePublicId: true,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,

        message: "Certificate assets uploaded successfully.",

        assets: uploadedAssets,

        seminar: updatedSeminar,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    console.error("CERTIFICATE ASSET UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Something went wrong while uploading certificate assets.",
      },
      {
        status: 500,
      },
    );
  }
}

// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
// import { getAdmin } from "@/lib/auth";
// import { v2 as cloudinary } from "cloudinary";

// export const runtime = "nodejs";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const MAX_FILE_SIZE = 5 * 1024 * 1024;

// const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// const ASSET_CONFIG = {
//   trainerSignature: {
//     urlField: "trainerSignatureUrl",
//     publicIdField: "trainerSignaturePublicId",
//     folder: "seminars/certificates/signatures",
//   },

//   certificateStamp: {
//     urlField: "certificateStampUrl",
//     publicIdField: "certificateStampPublicId",
//     folder: "seminars/certificates/stamps",
//   },

//   authorizedSignature: {
//     urlField: "authorizedSignatureUrl",
//     publicIdField: "authorizedSignaturePublicId",
//     folder: "seminars/certificates/signatures",
//   },
// };

// function uploadToCloudinary(buffer, folder, originalName) {
//   return new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       {
//         folder,
//         resource_type: "image",
//         type: "upload",
//         use_filename: false,
//         unique_filename: true,
//         overwrite: false,
//         context: {
//           original_name: originalName,
//         },
//       },
//       (error, result) => {
//         if (error) {
//           reject(error);
//           return;
//         }

//         resolve(result);
//       },
//     );

//     stream.end(buffer);
//   });
// }

// export async function POST(req, { params }) {
//   try {
//     const admin = await getAdmin();

//     if (!admin) {
//       return NextResponse.json(
//         {
//           error: "Unauthorized",
//         },
//         {
//           status: 401,
//         },
//       );
//     }

//     const { id } = await params;

//     if (!id) {
//       return NextResponse.json(
//         {
//           error: "Seminar ID is required.",
//         },
//         {
//           status: 400,
//         },
//       );
//     }

//     const seminar = await prisma.seminar.findUnique({
//       where: {
//         id,
//       },
//     });

//     if (!seminar) {
//       return NextResponse.json(
//         {
//           error: "Seminar not found.",
//         },
//         {
//           status: 404,
//         },
//       );
//     }

//     const formData = await req.formData();

//     const updates = {};
//     const uploadedAssets = [];

//     for (const [fieldName, config] of Object.entries(ASSET_CONFIG)) {
//       const file = formData.get(fieldName);

//       // Asset is optional.
//       if (!file || typeof file === "string") {
//         continue;
//       }

//       if (!ALLOWED_TYPES.has(file.type)) {
//         return NextResponse.json(
//           {
//             error: `${fieldName} must be PNG, JPG, JPEG or WEBP.`,
//           },
//           {
//             status: 400,
//           },
//         );
//       }

//       if (file.size <= 0) {
//         return NextResponse.json(
//           {
//             error: `${fieldName} is empty.`,
//           },
//           {
//             status: 400,
//           },
//         );
//       }

//       if (file.size > MAX_FILE_SIZE) {
//         return NextResponse.json(
//           {
//             error: `${fieldName} cannot exceed 5 MB.`,
//           },
//           {
//             status: 400,
//           },
//         );
//       }

//       const buffer = Buffer.from(await file.arrayBuffer());

//       const result = await uploadToCloudinary(buffer, config.folder, file.name);

//       if (!result?.secure_url || !result?.public_id) {
//         throw new Error(`Cloudinary upload failed for ${fieldName}.`);
//       }

//       updates[config.urlField] = result.secure_url;
//       updates[config.publicIdField] = result.public_id;

//       uploadedAssets.push({
//         fieldName,
//         publicId: result.public_id,
//         url: result.secure_url,
//       });
//     }

//     if (Object.keys(updates).length === 0) {
//       return NextResponse.json(
//         {
//           success: true,
//           message: "No certificate assets were uploaded.",
//           assets: [],
//         },
//         {
//           status: 200,
//         },
//       );
//     }

//     const updatedSeminar = await prisma.seminar.update({
//       where: {
//         id,
//       },

//       data: {
//         trainerSignatureUrl: trainerSignatureUrl || null,

//         trainerSignaturePublicId: trainerSignaturePublicId || null,

//         // IMPORTANT:
//         // Prisma field is stampUrl, NOT certificateStampUrl
//         stampUrl: certificateStampUrl || null,

//         // IMPORTANT:
//         // Prisma field is stampPublicId, NOT certificateStampPublicId
//         stampPublicId: certificateStampPublicId || null,

//         authorizedSignatureUrl: authorizedSignatureUrl || null,

//         authorizedSignaturePublicId: authorizedSignaturePublicId || null,
//       },

//       select: {
//         id: true,

//         trainerSignatureUrl: true,
//         trainerSignaturePublicId: true,

//         stampUrl: true,
//         stampPublicId: true,

//         authorizedSignatureUrl: true,
//         authorizedSignaturePublicId: true,
//       },
//     });

//     return NextResponse.json(
//       {
//         success: true,
//         message: "Certificate assets uploaded successfully.",
//         assets: uploadedAssets,
//         seminar: updatedSeminar,
//       },
//       {
//         status: 200,
//       },
//     );
//   } catch (error) {
//     console.error("CERTIFICATE ASSET UPLOAD ERROR:", error);

//     return NextResponse.json(
//       {
//         error:
//           error?.message ||
//           "Something went wrong while uploading certificate assets.",
//       },
//       {
//         status: 500,
//       },
//     );
//   }
// }
