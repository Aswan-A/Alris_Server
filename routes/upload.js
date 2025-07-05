const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const runSave = require("../save"); 

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});

const upload = multer({
  storage,
});

// Upload route
router.post("/", upload.single("photo"), async (req, res) => {
  const photo = req.file;
  const description = req.body.description || "";
  const latitude = req.body.latitude || null;
  const longitude = req.body.longitude || null;

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
      description,
      latitude,
      longitude,
      classification: response.data.classification,
      isSpam: response.data.isSpam,
      isFake: response.data.isFake,
    });

    fs.unlink(imagePath, () => {}); // Cleanup uploaded file

    return res.status(200).json({
      message: "Upload processed successfully",
      ...response.data,
    });
  } catch (err) {
    console.error("Error:", err.message);
    fs.unlink(imagePath, () => {});
    return res.status(500).json({ error: "Upload failed." });
  }
});

module.exports = router;
