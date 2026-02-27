import express from "express";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseToken } from "../middleware/firebaseAuth.js";

const router = express.Router();

const defaultSettings = {
  teamMembers: [],
  notifications: {
    emailUpdates: true,
    interviewReminders: true,
    dailyDigest: false,
  },
  defaultPipeline: ["New", "Screen", "Interview", "Offer", "Hired"],
};

async function getRecruiterProfile(firebaseUid, supabase) {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, role, name, email")
    .eq("firebase_uid", firebaseUid)
    .limit(1);

  if (error) throw new Error(error.message);
  const profile = profiles && profiles[0];
  if (!profile) throw new Error("Profile not found");
  if (profile.role !== "recruiter") throw new Error("Recruiter access required");
  return profile;
}

// GET /api/recruiter/jobs
router.get("/jobs", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const { data: jobs, error } = await supabase
      .from("jobs")
      .select("id,title,team,company,location,type,salary,deadline,status,description,created_at")
      .eq("recruiter_id", recruiter.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[RECRUITER_JOBS] Supabase error:", error);
      return res.status(500).json({ message: error.message });
    }

    const jobIds = (jobs || []).map((job) => job.id);
    let applicantCounts = {};
    if (jobIds.length) {
      const { data: appData } = await supabase
        .from("applications")
        .select("job_id")
        .in("job_id", jobIds);

      (appData || []).forEach((app) => {
        applicantCounts[app.job_id] = (applicantCounts[app.job_id] || 0) + 1;
      });
    }

    const enriched = (jobs || []).map((job) => ({
      ...job,
      applicants: applicantCounts[job.id] || 0,
    }));

    console.log(`[RECRUITER_JOBS] Retrieved ${enriched.length} jobs for recruiter ${recruiter.id}`);
    res.json({ jobs: enriched });
  } catch (error) {
    console.error("[RECRUITER_JOBS] Error:", error);
    // Handle SSL/connection errors specifically
    const message = error.message.includes('<!DOCTYPE html>') 
      ? 'Database connection error. Please ensure backend server is running with proper SSL configuration.'
      : error.message;
    res.status(403).json({ message });
  }
});

// POST /api/recruiter/jobs
router.post("/jobs", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const {
      title,
      team,
      company,
      location,
      type,
      salary,
      deadline,
      status,
      description,
    } = req.body || {};

    if (!title) return res.status(400).json({ message: "Title is required" });

    const payload = {
      recruiter_id: recruiter.id,
      title,
      team: team || null,
      company: company || null,
      location: location || null,
      type: type || null,
      salary: salary || null,
      deadline: deadline || null,
      status: status || "Open",
      description: description || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("jobs").insert([payload]).select().limit(1);
    if (error) return res.status(500).json({ message: error.message });

    res.status(201).json({ job: data && data[0] });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// PUT /api/recruiter/jobs/:id
router.put("/jobs/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const jobId = req.params.id;
    const updates = req.body || {};

    const { data, error } = await supabase
      .from("jobs")
      .update(updates)
      .eq("id", jobId)
      .eq("recruiter_id", recruiter.id)
      .select()
      .limit(1);

    if (error) return res.status(500).json({ message: error.message });
    const job = data && data[0];
    if (!job) return res.status(404).json({ message: "Job not found" });

    res.json({ job });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// GET /api/recruiter/applicants
router.get("/applicants", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const { data: applications, error } = await supabase
      .from("applications")
      .select(
        "id,status,created_at,notes,job:jobs!applications_job_id_fkey(id,title,team),candidate:profiles!applications_candidate_id_fkey(id,name,role,college,avatar_url)"
      )
      .eq("recruiter_id", recruiter.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[RECRUITER_APPLICANTS] Supabase error:", error);
      return res.status(500).json({ message: error.message });
    }

    console.log(`[RECRUITER_APPLICANTS] Retrieved ${(applications || []).length} applications`);
    res.json({ applicants: applications || [] });
  } catch (error) {
    console.error("[RECRUITER_APPLICANTS] Error:", error);
    const message = error.message.includes('<!DOCTYPE html>') 
      ? 'Database connection error. Please ensure backend server is running with proper SSL configuration.'
      : error.message;
    res.status(403).json({ message });
  }
});

// POST /api/recruiter/applicants
router.post("/applicants", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const { candidate_id, job_id, status } = req.body || {};
    if (!candidate_id || !job_id) {
      return res.status(400).json({ message: "candidate_id and job_id are required" });
    }

    const { data: jobs, error: jobErr } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", job_id)
      .eq("recruiter_id", recruiter.id)
      .limit(1);

    if (jobErr) return res.status(500).json({ message: jobErr.message });
    if (!jobs || !jobs[0]) return res.status(404).json({ message: "Job not found" });

    const payload = {
      recruiter_id: recruiter.id,
      candidate_id,
      job_id,
      status: status || "New",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("applications").insert([payload]).select().limit(1);
    if (error) return res.status(500).json({ message: error.message });

    res.status(201).json({ applicant: data && data[0] });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// PATCH /api/recruiter/applicants/:id
router.patch("/applicants/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const appId = req.params.id;
    const { status, notes } = req.body || {};

    const updates = {
      updated_at: new Date().toISOString(),
    };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from("applications")
      .update(updates)
      .eq("id", appId)
      .eq("recruiter_id", recruiter.id)
      .select()
      .limit(1);

    if (error) return res.status(500).json({ message: error.message });
    const applicant = data && data[0];
    if (!applicant) return res.status(404).json({ message: "Applicant not found" });

    res.json({ applicant });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// GET /api/recruiter/candidates
router.get("/candidates", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    await getRecruiterProfile(firebaseUid, supabase);

    const q = (req.query.q || "").toString();

    let query = supabase
      .from("profiles")
      .select("id,name,role,college,avatar_url,email")
      .eq("role", "student")
      .order("created_at", { ascending: false })
      .limit(50);

    if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[RECRUITER_CANDIDATES] Supabase error:", error);
      return res.status(500).json({ message: error.message });
    }

    console.log(`[RECRUITER_CANDIDATES] Retrieved ${(data || []).length} candidates`);
    res.json({ candidates: data || [] });
  } catch (error) {
    console.error("[RECRUITER_CANDIDATES] Error:", error);
    const message = error.message.includes('<!DOCTYPE html>') 
      ? 'Database connection error. Please ensure backend server is running with proper SSL configuration.'
      : error.message;
    res.status(403).json({ message });
  }
});

// GET /api/recruiter/saved-candidates
router.get("/saved-candidates", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const { data, error } = await supabase
      .from("recruiter_saved_candidates")
      .select("candidate_id")
      .eq("recruiter_id", recruiter.id);

    if (error) return res.status(500).json({ message: error.message });

    const ids = (data || []).map((row) => row.candidate_id);
    res.json({ savedCandidateIds: ids });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// POST /api/recruiter/saved-candidates
router.post("/saved-candidates", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const { candidate_id } = req.body || {};
    if (!candidate_id) return res.status(400).json({ message: "candidate_id is required" });

    const payload = {
      recruiter_id: recruiter.id,
      candidate_id,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("recruiter_saved_candidates")
      .upsert([payload], { onConflict: "recruiter_id,candidate_id" });

    if (error) return res.status(500).json({ message: error.message });

    const { data: rows, error: listErr } = await supabase
      .from("recruiter_saved_candidates")
      .select("candidate_id")
      .eq("recruiter_id", recruiter.id);

    if (listErr) return res.status(500).json({ message: listErr.message });

    res.status(201).json({ savedCandidateIds: (rows || []).map((row) => row.candidate_id) });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// DELETE /api/recruiter/saved-candidates/:candidateId
router.delete("/saved-candidates/:candidateId", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const candidateId = req.params.candidateId;
    const { error } = await supabase
      .from("recruiter_saved_candidates")
      .delete()
      .eq("recruiter_id", recruiter.id)
      .eq("candidate_id", candidateId);

    if (error) return res.status(500).json({ message: error.message });

    const { data: rows, error: listErr } = await supabase
      .from("recruiter_saved_candidates")
      .select("candidate_id")
      .eq("recruiter_id", recruiter.id);

    if (listErr) return res.status(500).json({ message: listErr.message });

    res.json({ savedCandidateIds: (rows || []).map((row) => row.candidate_id) });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// GET /api/recruiter/interviews
router.get("/interviews", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const { data, error } = await supabase
      .from("recruiter_interviews")
      .select("*")
      .eq("recruiter_id", recruiter.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });

    const interviews = (data || []).map((row) => ({
      id: row.id,
      candidateName: row.candidate_name,
      jobTitle: row.job_title,
      interviewer: row.interviewer,
      date: row.interview_date,
      time: row.interview_time,
      location: row.location,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
    }));

    res.json({ interviews });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// POST /api/recruiter/interviews
router.post("/interviews", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const {
      candidateName,
      jobTitle,
      interviewer,
      date,
      time,
      location,
      status,
      notes,
    } = req.body || {};

    if (!candidateName) return res.status(400).json({ message: "candidateName is required" });

    const payload = {
      recruiter_id: recruiter.id,
      candidate_name: candidateName,
      job_title: jobTitle || null,
      interviewer: interviewer || null,
      interview_date: date || null,
      interview_time: time || null,
      location: location || null,
      status: status || "Scheduled",
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("recruiter_interviews")
      .insert([payload])
      .select()
      .limit(1);

    if (error) return res.status(500).json({ message: error.message });

    const row = data && data[0];
    res.status(201).json({
      interview: row
        ? {
            id: row.id,
            candidateName: row.candidate_name,
            jobTitle: row.job_title,
            interviewer: row.interviewer,
            date: row.interview_date,
            time: row.interview_time,
            location: row.location,
            status: row.status,
            notes: row.notes,
            createdAt: row.created_at,
          }
        : null,
    });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// PATCH /api/recruiter/interviews/:id
router.patch("/interviews/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const interviewId = req.params.id;
    const {
      candidateName,
      jobTitle,
      interviewer,
      date,
      time,
      location,
      status,
      notes,
    } = req.body || {};

    const updates = { updated_at: new Date().toISOString() };
    if (candidateName !== undefined) updates.candidate_name = candidateName;
    if (jobTitle !== undefined) updates.job_title = jobTitle;
    if (interviewer !== undefined) updates.interviewer = interviewer;
    if (date !== undefined) updates.interview_date = date;
    if (time !== undefined) updates.interview_time = time;
    if (location !== undefined) updates.location = location;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from("recruiter_interviews")
      .update(updates)
      .eq("id", interviewId)
      .eq("recruiter_id", recruiter.id)
      .select()
      .limit(1);

    if (error) return res.status(500).json({ message: error.message });
    const row = data && data[0];
    if (!row) return res.status(404).json({ message: "Interview not found" });

    res.json({
      interview: {
        id: row.id,
        candidateName: row.candidate_name,
        jobTitle: row.job_title,
        interviewer: row.interviewer,
        date: row.interview_date,
        time: row.interview_time,
        location: row.location,
        status: row.status,
        notes: row.notes,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// DELETE /api/recruiter/interviews/:id
router.delete("/interviews/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const interviewId = req.params.id;
    const { error } = await supabase
      .from("recruiter_interviews")
      .delete()
      .eq("id", interviewId)
      .eq("recruiter_id", recruiter.id);

    if (error) return res.status(500).json({ message: error.message });

    res.json({ ok: true });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// GET /api/recruiter/settings
router.get("/settings", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const { data, error } = await supabase
      .from("recruiter_settings")
      .select("*")
      .eq("recruiter_id", recruiter.id)
      .limit(1);

    if (error) return res.status(500).json({ message: error.message });

    const row = data && data[0];
    if (!row) {
      return res.json({ settings: defaultSettings });
    }

    res.json({
      settings: {
        teamMembers: row.team_members || [],
        notifications: row.notifications || defaultSettings.notifications,
        defaultPipeline: row.default_pipeline || defaultSettings.defaultPipeline,
      },
    });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// PUT /api/recruiter/settings
router.put("/settings", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const { teamMembers, notifications, defaultPipeline } = req.body || {};

    const payload = {
      recruiter_id: recruiter.id,
      team_members: teamMembers || defaultSettings.teamMembers,
      notifications: notifications || defaultSettings.notifications,
      default_pipeline: defaultPipeline || defaultSettings.defaultPipeline,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("recruiter_settings")
      .upsert([payload], { onConflict: "recruiter_id" })
      .select()
      .limit(1);

    if (error) return res.status(500).json({ message: error.message });

    const row = data && data[0];
    res.json({
      settings: {
        teamMembers: row?.team_members || payload.team_members,
        notifications: row?.notifications || payload.notifications,
        defaultPipeline: row?.default_pipeline || payload.default_pipeline,
      },
    });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

// GET /api/recruiter/overview
router.get("/overview", verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const supabase = getSupabase();
    const recruiter = await getRecruiterProfile(firebaseUid, supabase);

    const { data: jobs } = await supabase
      .from("jobs")
      .select("id,status")
      .eq("recruiter_id", recruiter.id);

    const { data: apps } = await supabase
      .from("applications")
      .select("id,status")
      .eq("recruiter_id", recruiter.id);

    const openRoles = (jobs || []).filter((job) => job.status !== "Closed").length;
    const applicants = (apps || []).length;
    const interviews = (apps || []).filter((app) => app.status === "Interview").length;
    const offers = (apps || []).filter((app) => app.status === "Offer").length;

    res.json({ overview: { openRoles, applicants, interviews, offers } });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

export default router;
