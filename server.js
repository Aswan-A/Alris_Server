const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const uploadRoute = require("./routes/upload");
const reportRoute = require("./routes/reports");
const initDB = require("./db/initDb");

const app = express();
const PORT = 5000;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

if (!supabaseUrl || !supabaseServiceKey || !supabaseJwtSecret) {
  console.error("Missing required Supabase environment variables");
  process.exit(1);
}

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Helper function to check if user is verified admin
const isVerifiedAdmin = async (email) => {
  try {
    const { data, error } = await supabase
      .from("verified_admins")
      .select("*")
      .eq("email", email)
      .single();
    
    if (error && error.code !== "PGRST116") { // PGRST116 is "not found" error
      console.error("Error checking verified admin:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error in isVerifiedAdmin:", error);
    return false;
  }
};

// JWT verification helper
// JWT verification helper
const verifySupabaseToken = async (token) => {
  try {
    const payload = jwt.verify(token, supabaseJwtSecret, {
issuer: `${supabaseUrl}/auth/v1`,
      audience: "authenticated",
    });
    return payload;
  } catch (error) {
    throw new Error(`JWT verification failed: ${error.message}`);
  }
};

// Verify token endpoint
app.post("/verifyToken", async (req, res) => {
  const { accessToken, role } = req.body;

  if (!accessToken || !role) {
    return res.status(400).json({ error: "Missing accessToken or role" });
  }

  try {
    // Verify the JWT token
    const payload = await verifySupabaseToken(accessToken);
    
    const uid = payload.sub;
    const email = payload.email;
    const name = payload.user_metadata?.name || payload.user_metadata?.full_name || "";

    if (!uid || !email) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // Check if user exists in our users table
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", uid)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching user:", fetchError);
      return res.status(500).json({ error: "Database error" });
    }

    // If user doesn't exist, create new user
    if (!existingUser) {
      let status = "pending";

      if (role === "user") {
        status = "approved";
      } else if (role === "admin") {
        const verified = await isVerifiedAdmin(email);
        status = verified ? "approved" : "denied";
      }

      // Create new user
      const { error: createError } = await supabase
        .from("users")
        .insert({
          id: uid,
          email,
          name,
          role,
          status,
          created_at: new Date().toISOString(),
        });

      if (createError) {
        console.error("Error creating user:", createError);
        return res.status(500).json({ error: "Failed to create user" });
      }

      // If status is pending, create approval request
      if (status === "pending") {
        const { error: approvalError } = await supabase
          .from("approval_requests")
          .insert({
            user_id: uid,
            email,
            role,
            status: "pending",
            created_at: new Date().toISOString(),
          });

        if (approvalError) {
          console.error("Error creating approval request:", approvalError);
          // Don't return error here as user creation was successful
        }
      }

      console.log(
        `[verifyToken] New ${role} registered: ${email}, status: ${status}`
      );
      return res.status(200).json({ status });
    }

    // User exists, check role consistency
    if (existingUser.role !== role) {
      return res.status(403).json({
        error: `Role mismatch. You are registered as '${existingUser.role}', not '${role}'.`,
        status: "denied",
      });
    }

    return res.status(200).json({ status: existingUser.status });
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Routes
app.use("/reports", reportRoute);
app.use("/upload", uploadRoute);

// Initialize database and start server
initDB().then(() => {
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});})