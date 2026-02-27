// SSL Configuration MUST be set BEFORE any imports that use HTTPS
// This fixes SSL handshake errors with Supabase/Cloudflare
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import "./config/supabase.js";
import authRoutes from "./routes/auth.js";
import postsRoutes from "./routes/posts.js";
import messagesRoutes from "./routes/messages.js";
import connectionsRoutes from "./routes/connections.js";
import recruiterRoutes from "./routes/recruiter.js";

// Firebase Admin is initialized lazily within routes that need it
const app = express();

app.use(cors());
// Increase payload size limits to handle base64 encoded images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    supabaseUrl: process.env.SUPABASE_URL ? "configured" : "missing",
    firebaseConfigured: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.FIREBASE_SERVICE_ACCOUNT ? "yes" : "no"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/connections", connectionsRoutes);
app.use("/api/recruiter", recruiterRoutes);

app.get("/", (req, res) => {
  res.send("CodeCampus API running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

