const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const runSave = require("../utils/save");
const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});

const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type."));
  },
});




router.post("/multi", async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      userId = null,
      description = "",  
      images = [],
    } = req.body;

    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "No images provided." });
    }

    const reportId = uuidv4(); 
    const results = [];

    for (const img of images) {
      const { filename, base64 } = img;

      if (!filename || !base64) {
        results.push({
          filename: filename || "unknown",
          status: "error",
          error: "Missing filename or base64 data.",
        });
        continue;
      }

      const buffer = Buffer.from(base64, "base64");
      const uniqueName = `${uuidv4()}-${filename}`;
      const tempPath = path.join(uploadDir, uniqueName);

      fs.writeFileSync(tempPath, buffer);

      try {
        const form = new FormData();
        form.append("photo", fs.createReadStream(tempPath));
        form.append("description", description); 
        if (latitude) form.append("latitude", latitude);
        if (longitude) form.append("longitude", longitude);

        const response = await axios.post("http://localhost:8000/model", form, {
          headers: {
            ...form.getHeaders(),
            "x-api-key": process.env.API_KEY,
          },
        });

        await runSave({
          photo: { filename: uniqueName },
          imagePath: tempPath,
          description,
          latitude,
          longitude,
          label: response.data.classification.label,
          department: response.data.classification.department,
          isSpam: response.data.isSpam?.spam ?? false,
          isFake: response.data.isFake?.fake ?? false,
          userId,
          issueId: response.data.merge?.issue_id ?? null,
          isDuplicate: response.data.merge?.is_duplicate ?? false,
          duplicateOfId: response.data.merge?.duplicate_of_id ?? null,
          embedding: response.data.merge?.embedding ?? null,
          reportId, 
        });

        results.push({
          filename,
          status: "success",
          label: response.data.classification.label,
          reportId,
        });
      } catch (err) {
        console.error(`❌ Error processing ${filename}:`, err.message);
        results.push({
          filename,
          status: "error",
          error: err.message,
        });
      } finally {
        // Cleanup temp image
        fs.unlink(tempPath, () => {});
      }
    }

    return res.status(200).json({
      message: "Upload(s) processed",
      reportId,
      results,
    });
  } catch (err) {
    console.error("❌ Multi-upload error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
