import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const timestamp = Math.floor(Date.now() / 1000);

    // Cloudinary signed upload signature.
    // For this diagnostic request, sign the parameters we're sending.
    const crypto = await import("crypto");

    const signatureString = `folder=test-uploads&timestamp=${timestamp}`;

    const signature = crypto
      .createHash("sha1")
      .update(signatureString + apiSecret)
      .digest("hex");

    const cloudinaryForm = new FormData();

    cloudinaryForm.append(
      "file",
      new Blob([buffer], {
        type: file.type || "application/octet-stream",
      }),
      file.name,
    );

    cloudinaryForm.append("api_key", apiKey);
    cloudinaryForm.append("timestamp", String(timestamp));
    cloudinaryForm.append("folder", "test-uploads");
    cloudinaryForm.append("resource_type", "raw");
    cloudinaryForm.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
      {
        method: "POST",
        body: cloudinaryForm,
      },
    );

    const responseText = await response.text();

    console.log("Cloudinary status:", response.status);

    console.log("Cloudinary X-Cld-Error:", response.headers.get("X-Cld-Error"));

    console.log("Cloudinary response:", responseText);

    return NextResponse.json(
      {
        status: response.status,
        ok: response.ok,
        cloudinaryError: response.headers.get("X-Cld-Error") || null,
        response: responseText,
      },
      {
        status: response.ok ? 200 : response.status,
      },
    );
  } catch (error) {
    console.error("Cloudinary direct upload test:", error);

    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
