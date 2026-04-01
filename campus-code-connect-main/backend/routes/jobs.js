import { Router } from "express";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseToken } from "../middleware/firebaseAuth.js";

const router = Router();

// GET /api/jobs - Get all jobs with optional filters
router.get("/", async (req, res) => {
  try {
    const { search, type, location, company, skills } = req.query;
    
    const supabase = getSupabase();
    let query = supabase
      .from("jobs")
      .select(`
        *,
        recruiter:profiles!jobs_recruiter_id_fkey(id, name, avatar_url)
      `)
      .eq("status", "Open")
      .order("created_at", { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (type) {
      query = query.eq("type", type);
    }

    if (location) {
      query = query.ilike("location", `%${location}%`);
    }

    if (company) {
      query = query.ilike("company", `%${company}%`);
    }

    if (skills) {
      // Skills can be comma-separated
      const skillsArray = skills.split(",").map(s => s.trim());
      query = query.overlaps("skills", skillsArray);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error("[JOBS_GET] Supabase error:", error);
      return res.status(500).json({ message: "Failed to fetch jobs", error: error.message });
    }

    res.json({ jobs: jobs || [] });
  } catch (error) {
    console.error("[JOBS_GET] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/jobs/saved - Get user's saved jobs
router.get("/saved", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    // Get user profile ID from firebase UID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("firebase_uid", firebaseUid)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const { data: savedJobs, error } = await supabase
      .from("saved_jobs")
      .select(`
        *,
        job:jobs!saved_jobs_job_id_fkey(
          *,
          recruiter:profiles!jobs_recruiter_id_fkey(id, name, company, avatar_url)
        )
      `)
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[SAVED_JOBS_GET] Supabase error:", error);
      return res.status(500).json({ message: "Failed to fetch saved jobs", error: error.message });
    }

    // Extract just the job data
    const jobs = (savedJobs || []).map(sj => ({
      ...sj.job,
      savedAt: sj.created_at,
      savedId: sj.id
    }));

    res.json({ jobs });
  } catch (error) {
    console.error("[SAVED_JOBS_GET] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/jobs/:jobId/save - Save a job
router.post("/:jobId/save", verifyFirebaseToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    // Get user profile ID from firebase UID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("firebase_uid", firebaseUid)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Check if job exists
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Save the job
    const { data, error } = await supabase
      .from("saved_jobs")
      .insert([{ user_id: profile.id, job_id: jobId }])
      .select()
      .single();

    if (error) {
      // Check if already saved
      if (error.code === "23505") {
        return res.status(400).json({ message: "Job already saved" });
      }
      console.error("[SAVE_JOB] Supabase error:", error);
      return res.status(500).json({ message: "Failed to save job", error: error.message });
    }

    res.json({ message: "Job saved successfully", savedJob: data });
  } catch (error) {
    console.error("[SAVE_JOB] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /api/jobs/:jobId/save - Unsave a job
router.delete("/:jobId/save", verifyFirebaseToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    // Get user profile ID from firebase UID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("firebase_uid", firebaseUid)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const { error } = await supabase
      .from("saved_jobs")
      .delete()
      .eq("user_id", profile.id)
      .eq("job_id", jobId);

    if (error) {
      console.error("[UNSAVE_JOB] Supabase error:", error);
      return res.status(500).json({ message: "Failed to unsave job", error: error.message });
    }

    res.json({ message: "Job unsaved successfully" });
  } catch (error) {
    console.error("[UNSAVE_JOB] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET /api/jobs/:jobId - Get single job details
router.get("/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const supabase = getSupabase();

    const { data: job, error } = await supabase
      .from("jobs")
      .select(`
        *,
        recruiter:profiles!jobs_recruiter_id_fkey(id, name, company, avatar_url)
      `)
      .eq("id", jobId)
      .single();

    if (error || !job) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json({ job });
  } catch (error) {
    console.error("[JOB_GET] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/jobs/:jobId/apply - Apply to a job
router.post("/:jobId/apply", verifyFirebaseToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();

    // Get user profile ID from firebase UID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("firebase_uid", firebaseUid)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Get the job with recruiter info
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, recruiter_id, title")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Create application
    const { data, error } = await supabase
      .from("applications")
      .insert([{
        job_id: jobId,
        candidate_id: profile.id,
        recruiter_id: job.recruiter_id,
        status: "New"
      }])
      .select()
      .single();

    if (error) {
      // Check if already applied
      if (error.code === "23505") {
        return res.status(400).json({ message: "You have already applied to this job" });
      }
      console.error("[APPLY_JOB] Supabase error:", error);
      return res.status(500).json({ message: "Failed to apply to job", error: error.message });
    }

    res.json({ message: "Application submitted successfully", application: data });
  } catch (error) {
    console.error("[APPLY_JOB] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
