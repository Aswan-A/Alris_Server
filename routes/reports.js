const express = require("express");
const router = express.Router();
const db = require("../db/db");

// GET /reports
router.get("/", async (req, res) => {
  try {
    const reports = await db("uploads").orderBy("created_at", "desc");
    res.status(200).json(reports);
  } catch (err) {
    console.error("❌ Error fetching reports:", err.message);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

module.exports = router;
