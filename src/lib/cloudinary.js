import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dnnbf7fmx",
  api_key: process.env.CLOUDINARY_API_KEY || "853292489762663",
  api_secret: process.env.CLOUDINARY_API_SECRET || "IYImZ22ABBxg8_9IS_ZVJh5wrWU",
  secure: true,
});

/**
 * Upload an image (Data URI, base64, or remote URL) to Cloudinary
 * @param {string} fileData - Base64 data URI or image URL
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
export async function uploadToCloudinary(fileData, options = {}) {
  const uploadOptions = {
    folder: "family_health_survey/evidence",
    resource_type: "image",
    ...options,
  };

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(fileData, uploadOptions, (error, result) => {
      if (error) {
        console.error("Cloudinary upload error:", error);
        return reject(error);
      }
      resolve(result);
    });
  });
}

export default cloudinary;
