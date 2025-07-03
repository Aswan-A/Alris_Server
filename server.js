// server.js
const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const uploadRoute = require("./routes/upload");

const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.json());

// Firebase Admin setup
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});

// Verify token endpoint
app.post("/verifyToken", async (req, res) => {
  const { idToken } = req.body;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    res.status(200).json({ message: "Token verified", uid });
    console.log("Token verification successful");
  } catch (error) {
    console.error("Token verification failed:", error.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// Use modular upload route
app.use("/upload", uploadRoute);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
