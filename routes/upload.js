const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // you can customize this for uniqueness
  },
});
const upload = multer({ storage });

// Upload route
router.post("/", upload.single("photo"), (req, res) => {
  const photo = req.file;
  const lat = req.body.latitude;
  const lon = req.body.longitude;

  if (!photo) {
    return res.status(400).send("No file uploaded.");
  }

  const imagePath = path.join(uploadDir, photo.filename);

  console.log(`Received photo: ${photo.filename}`);
  console.log(`Location: Latitude = ${lat}, Longitude = ${lon}`);

  exec(`python clip_classifier.py "${imagePath}"`, (err, stdout, stderr) => {
    fs.unlink(imagePath, () => {}); // delete uploaded file after processing

    if (err) {
      console.error("Python script error:", stderr);
      return res.status(500).json({ error: "Failed to classify image." });
    }

    const label = stdout.trim();
    console.log(`Classification: ${label}`);

    return res.status(200).json({
      message: "Upload and classification successful",
      classification: label,
      location: { latitude: lat, longitude: lon },
    });
  });
});

module.exports = router;
