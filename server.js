const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const uploadRoute = require("./routes/upload");
const reportRoute = require("./routes/reports");
const initDB = require("./db/initDb");

const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.json());

const isVerifiedAdmin = async (email) => {
  const doc = await admin
    .firestore()
    .collection("verified_admins")
    .doc(email)
    .get();
  return doc.exists;
};
// Firebase Admin setup
admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});

// Verify token endpoint
app.post("/verifyToken", async (req, res) => {
  const { idToken, role } = req.body;

  if (!idToken || !role) {
    return res.status(400).json({ error: "Missing idToken or role" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name || "";
    const userRef = admin.firestore().collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      let status = "pending";

      if (role === "user") {
        status = "approved";
      } else if (role === "admin") {
        const verified = await isVerifiedAdmin(email);
        status = verified ? "approved" : "denied";
      }
      await userRef.set({ email, name, role, status });

      if (status === "pending") {
        await admin.firestore().collection("approval_requests").add({
          uid,
          email,
          role,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: "pending",
        });
      }

      console.log(
        `[verifyToken] New ${role} registered: ${email}, status: ${status}`
      );
      return res.status(200).json({ status });
    }

    const data = userDoc.data();

    if (data.role !== role) {
      return res.status(403).json({
        error: `Role mismatch. You are registered as '${data.role}', not '${role}'.`,
        status: "denied",
      });
    }

    return res.status(200).json({ status: data.status });
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});
app.use("/reports", reportRoute);
app.use("/upload", uploadRoute);
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});