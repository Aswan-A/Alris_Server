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
    label,
    department,
    isSpam,
    isFake,
    userId,
    issueId,
    isDuplicate,
    duplicateOfId,
    embedding,
    reportId 
  } = data;


  try {
    const fileBuffer = fs.readFileSync(imagePath);
    const storagePath = `${department}/${photo.filename}`;


    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: photo.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error(" Supabase upload error:", uploadError.message);
      throw new Error("Failed to upload image to Supabase.");
    }

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;
    const formattedEmbedding = `[${embedding.join(',')}]`;
     await db("uploads").insert({
    filename: photo.filename,
    department,
    description,
    latitude,
    longitude,
    label,
    is_spam: isSpam,
    is_fake: isFake,
    user_id: userId || "anonymous",
    public_url: publicUrl,
    issue_id: issueId,
    is_duplicate: isDuplicate,  
    duplicate_of_id: duplicateOfId,
    embedding: db.raw("?::vector", [formattedEmbedding]),
    location: db.raw("ST_SetSRID(ST_MakePoint(?, ?), 4326)", [longitude, latitude]),
    report_id: reportId 
  });


    console.log("Saved to DB:", {
      publicUrl,
      label,
      department,
      isSpam,
      isFake,
      latitude,
      longitude,
      issueId,
      isDuplicate,
      duplicateOfId,
      reportId
    });


    return true;
  } catch (err) {
    console.error("❌ Save error:", err.message);
    throw err;
  }
};
