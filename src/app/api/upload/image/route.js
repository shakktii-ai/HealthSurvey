import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const auth = await requireAuth(["field_worker", "superadmin", "donor"]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const contentType = request.headers.get("content-type") || "";
    let fileData = null;
    let latitude = null;
    let longitude = null;
    let accuracy = null;
    let questionCode = "GEN";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) {
        return NextResponse.json({ success: false, error: "No image file provided" }, { status: 400 });
      }

      latitude = formData.get("latitude") ? parseFloat(formData.get("latitude")) : null;
      longitude = formData.get("longitude") ? parseFloat(formData.get("longitude")) : null;
      accuracy = formData.get("accuracy") ? parseFloat(formData.get("accuracy")) : null;
      questionCode = formData.get("questionCode") || "GEN";

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mime = file.type || "image/jpeg";
      fileData = `data:${mime};base64,${buffer.toString("base64")}`;
    } else {
      const body = await request.json();
      fileData = body.dataUri || body.image;
      latitude = body.latitude !== undefined ? parseFloat(body.latitude) : null;
      longitude = body.longitude !== undefined ? parseFloat(body.longitude) : null;
      accuracy = body.accuracy !== undefined ? parseFloat(body.accuracy) : null;
      questionCode = body.questionCode || "GEN";
    }

    if (!fileData) {
      return NextResponse.json({ success: false, error: "Image data is required" }, { status: 400 });
    }

    const uploadRes = await uploadToCloudinary(fileData, {
      folder: "family_health_survey/evidence",
      tags: ["health_survey", questionCode],
      context: {
        latitude: latitude ? String(latitude) : "",
        longitude: longitude ? String(longitude) : "",
        uploader: auth.user.id || auth.user._id,
      },
    });

    const geotag = {
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
      capturedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      url: uploadRes.secure_url,
      publicId: uploadRes.public_id,
      format: uploadRes.format,
      bytes: uploadRes.bytes,
      geotag,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload image to Cloudinary" },
      { status: 500 }
    );
  }
}
