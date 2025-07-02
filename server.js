const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");

// Initialize Express app
const app = express();
const PORT = 5000;



// Middleware
app.use(bodyParser.json());

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")), // Make sure this file is present
});

// Endpoint to verify Firebase ID token
app.post("/verifyToken", async (req, res) => {
  const { idToken } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    res.status(200).json({ message: "Token verified", uid });
    console.error("Token verification successful");
  } catch (error) {
    console.error("Token verification failed:", error.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Set up multer for handling photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Or use a timestamp for uniqueness
  },
});
const upload = multer({ storage });

// File upload endpoint
app.post("/upload", upload.single("photo"), (req, res) => {
  const photo = req.file;
  const lat = req.body.latitude;
  const lon = req.body.longitude;

  if (!photo) {
    return res.status(400).send("No file uploaded.");
  }

  console.log(`Received photo: ${photo.filename}`);
  console.log(`Location: Latitude = ${lat}, Longitude = ${lon}`);

  res.send("Upload successful");
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://192.168.0.159:${PORT}`);
});
