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

// POST /upload route
router.post("/", upload.single("photo"), async (req, res) => {
  const { userId, description = "", latitude = null, longitude = null } = req.body;
  const photo = req.file;

  if (!photo) {
    return res.status(400).json({ error: "No image uploaded." });
  }

  const imagePath = path.join(uploadDir, photo.filename);

  try {
    const form = new FormData();
    form.append("photo", fs.createReadStream(imagePath));
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
  photo,
  imagePath, 
  description,
  latitude,
  longitude,
  classification: response.data.classification.label,
  isSpam: response.data.isSpam?.spam ?? false,
  isFake: response.data.isFake?.fake ?? false,
  userId
});


    fs.unlink(imagePath, () => {}); // Cleanup temp image

    return res.status(200).json({
      message: "Upload processed successfully",
      ...response.data,
    });
  } catch (err) {
    console.error("Upload error:", err.message);
    fs.unlink(imagePath, () => {});
    return res.status(500).json({ error: "Upload failed. Please try again." });
  }
});

module.exports = router;
