const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const runClassifier = require("../api/classifier");
const runSpamCheck = require("../api/spam");
const runFakeDetection = require("../api/fake");
const runSave = require("../save");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.post("/", upload.single("photo"), async (req, res) => {
  const photo = req.file;
  const description = req.body.description || "";
  const latitude = req.body.latitude || null;
  const longitude = req.body.longitude || null;

  if (!photo) return res.status(400).json({ error: "No image uploaded." });

  const imagePath = path.join(uploadDir, photo.filename);

  try {
    const [classification, isFake, isSpam] = await Promise.all([
      runClassifier(imagePath),
      runFakeDetection(imagePath),
      runSpamCheck(description),
    ]);

    await runSave({
      photo,
      description,
      latitude,
      longitude,
      classification,
      isSpam,
      isFake,
    });

    fs.unlink(imagePath, () => {}); // Cleanup temp image

    return res.status(200).json({
      message: "Upload processed",
      classification,
      isSpam,
      isFake,
      description,
      location: { latitude, longitude },
    });
  } catch (err) {
    console.error("Error:", err);
    fs.unlink(imagePath, () => {});
    return res.status(500).json({ error: "Upload failed." });
  }
});

module.exports = router;
