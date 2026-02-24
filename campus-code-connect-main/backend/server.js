import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import "./config/supabase.js";
import authRoutes from "./routes/auth.js";
import postsRoutes from "./routes/posts.js";
import messagesRoutes from "./routes/messages.js";

// Firebase Admin is initialized lazily within routes that need it
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/messages", messagesRoutes);

app.get("/", (req, res) => {
  res.send("CodeCampus API running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

