const db = require("../db/db");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

const BUCKET_NAME = "aliris-storage"; 

module.exports = async function runSave(data) {
  const {
    photo,
    imagePath, 
    description,
    latitude,
    longitude,
    classification,
    isSpam,
    isFake,
    userId,
  } = data;

  try {
    const fileBuffer = fs.readFileSync(imagePath);
    const storagePath = `${classification}/${photo.filename}`;


    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: photo.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ Supabase upload error:", uploadError.message);
      throw new Error("Failed to upload image to Supabase.");
    }

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;

    await db("uploads").insert({
      filename: photo.filename,
      description,
      latitude,
      longitude,
      classification,
      is_spam: isSpam,
      is_fake: isFake,
      user_id: userId || "anonymous",
      public_url: publicUrl
    });

    console.log("✅ Saved to DB:", {
      publicUrl,
      classification,
      isSpam,
      isFake,
      latitude,
      longitude,
    });

    return true;
  } catch (err) {
    console.error("❌ Save error:", err.message);
    throw err;
  }
};
