import express from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseIdToken } from "../middleware/firebaseAuth.js";

const router = express.Router();

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
}

async function requireAdminAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "Missing authorization token" });
    }

    // 1) Admin panel JWT issued by /api/feedback/admin/login
    try {
      const decodedJwt = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
      if (decodedJwt?.role === "admin" && decodedJwt?.username === "admin") {
        req.admin = { username: "admin", role: "admin" };
        return next();
      }
    } catch (e) {
      // ignore and try Firebase token below
    }

    // 2) Firebase token path (only allow if role is admin in token claims)
    try {
      const firebaseDecoded = await verifyFirebaseIdToken(token);
      if (firebaseDecoded?.role === "admin") {
        req.admin = { username: firebaseDecoded.email || firebaseDecoded.uid, role: "admin" };
        return next();
      }
      return res.status(403).json({ message: "Admin access required" });
    } catch (e) {
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}

// POST /api/feedback/admin/login - static admin login for dashboard access
router.post("/admin/login", (req, res) => {
  try {
    const username = (req.body?.username || "").trim();
    const password = (req.body?.password || "").trim();

    if (username !== "admin" || password !== "admin") {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { username: "admin", role: "admin", source: "feedback-admin" },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "12h" }
    );

    res.json({ success: true, token, admin: { username: "admin", role: "admin" } });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/feedback/submit - submit feedback form
router.post("/submit", async (req, res) => {
  try {
    const name = (req.body?.name || "").trim();
    const email = (req.body?.email || "").trim();
    const category = (req.body?.category || "general").trim().toLowerCase();
    const message = (req.body?.message || "").trim();
    const allowedCategories = ["general", "bug", "feature", "support"];

    // Validate input
    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid feedback category" });
    }

    if (message.length < 10) {
      return res.status(400).json({ message: "Message must be at least 10 characters" });
    }

    if (message.length > 2000) {
      return res.status(400).json({ message: "Message must be less than 2000 characters" });
    }

    const supabase = getSupabase();

    // Insert feedback into database
    const { data, error } = await supabase
      .from("feedback")
      .insert([
        {
          name,
          email,
          category,
          message,
          status: "new",
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("[FEEDBACK] Insert error:", error);
      return res.status(500).json({ message: "Failed to submit feedback" });
    }

    console.log("[FEEDBACK] Submitted by:", name, "Category:", category);

    // TODO: Send confirmation email to user

    res.json({
      success: true,
      message: "Thank you for your feedback. We'll review it shortly.",
    });
  } catch (e) {
    console.error("[FEEDBACK] Error:", e);
    res.status(500).json({ message: e.message });
  }
});

// POST /api/feedback/report - report a post/content (authenticated user)
router.post("/report", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: "Missing authorization token" });
    }

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(token);
    } catch (e) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const reportedItemId = (req.body?.reportedItemId || "").trim();
    const reportedAuthor = (req.body?.reportedAuthor || "Unknown").trim();
    const reportedContent = (req.body?.reportedContent || "").trim();
    const reason = (req.body?.reason || "Inappropriate content").trim();

    if (!reportedItemId) {
      return res.status(400).json({ message: "Missing reported item id" });
    }

    const reporterName = (decoded?.name || decoded?.email || "User").trim();
    const reporterEmail = (decoded?.email || `${decoded?.uid || "user"}@codecampus.local`).trim();
    const safeContentPreview = reportedContent.slice(0, 300);

    const message = [
      `[REPORT] Content reported by user`,
      `Reason: ${reason}`,
      `Post ID: ${reportedItemId}`,
      `Post Author: ${reportedAuthor}`,
      `Preview: ${safeContentPreview || "N/A"}`,
      `Reporter UID: ${decoded?.uid || "N/A"}`,
    ].join("\n");

    const supabase = getSupabase();
    const { error } = await supabase.from("feedback").insert([
      {
        name: reporterName,
        email: reporterEmail,
        category: "support",
        message,
        status: "new",
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("[REPORT] Insert error:", error);
      return res.status(500).json({ message: "Failed to submit report" });
    }

    res.json({ success: true, message: "Reported successfully" });
  } catch (e) {
    console.error("[REPORT] Error:", e);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/feedback - get all feedback (admin only)
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json({ feedback: data });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/feedback/:id - update feedback status (admin only)
router.patch("/:id", requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("feedback")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    res.json({ success: true, feedback: data[0] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
