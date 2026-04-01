export type RecruiterInterview = {
  id: string;
  candidateName: string;
  jobTitle: string;
  interviewer: string;
  date: string | null;
  time: string | null;
  location: string;
  status: "Scheduled" | "Completed" | "Canceled";
  notes: string;
  createdAt: string;
};

export type CreateRecruiterInterviewInput = Omit<RecruiterInterview, "id" | "createdAt"> & {
  candidateId?: string;
  jobId?: string;
  applicationId?: string;
};

type RecruiterSettings = {
  teamMembers: Array<{ id: string; name: string; role: string; email: string }>;
  notifications: {
    emailUpdates: boolean;
    interviewReminders: boolean;
    dailyDigest: boolean;
  };
  defaultPipeline: string[];
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SETTINGS_CACHE_KEY = "recruiterSettingsCache";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
};

const defaultSettings: RecruiterSettings = {
  teamMembers: [],
  notifications: {
    emailUpdates: true,
    interviewReminders: true,
    dailyDigest: false,
  },
  defaultPipeline: ["New", "Screen", "Interview", "Offer", "Hired"],
};

const readSettingsCache = (): RecruiterSettings | null => {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      teamMembers: Array.isArray(parsed.teamMembers) ? parsed.teamMembers : defaultSettings.teamMembers,
      notifications: parsed.notifications || defaultSettings.notifications,
      defaultPipeline: Array.isArray(parsed.defaultPipeline)
        ? parsed.defaultPipeline
        : defaultSettings.defaultPipeline,
    };
  } catch {
    return null;
  }
};

const writeSettingsCache = (settings: RecruiterSettings) => {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // ignore cache write issues
  }
};

export const loadSavedCandidates = async (): Promise<string[]> => {
  const headers = getAuthHeaders();
  if (!headers) return [];
  const res = await fetch(`${API_BASE}/api/recruiter/saved-candidates`, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.savedCandidateIds || [];
};

export const toggleSavedCandidate = async (
  candidateId: string,
  currentlySaved: boolean
): Promise<string[]> => {
  const headers = getAuthHeaders();
  if (!headers) return [];

  const res = await fetch(
    `${API_BASE}/api/recruiter/saved-candidates${currentlySaved ? `/${candidateId}` : ""}`,
    {
      method: currentlySaved ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: currentlySaved ? undefined : JSON.stringify({ candidate_id: candidateId }),
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.savedCandidateIds || [];
};

export const loadRecruiterInterviews = async (): Promise<RecruiterInterview[]> => {
  const headers = getAuthHeaders();
  if (!headers) return [];
  const res = await fetch(`${API_BASE}/api/recruiter/interviews`, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.interviews || [];
};

export const addRecruiterInterview = async (
  interview: CreateRecruiterInterviewInput
): Promise<RecruiterInterview> => {
  const headers = getAuthHeaders();
  if (!headers) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE}/api/recruiter/interviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(interview),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Failed to schedule interview");
  }

  if (!data?.interview) {
    throw new Error("Interview response missing data");
  }

  return data.interview;
};

export const updateRecruiterInterview = async (
  id: string,
  updates: Partial<RecruiterInterview>
): Promise<RecruiterInterview | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;
  const res = await fetch(`${API_BASE}/api/recruiter/interviews/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.interview || null;
};

export const deleteRecruiterInterview = async (id: string): Promise<boolean> => {
  const headers = getAuthHeaders();
  if (!headers) return false;
  const res = await fetch(`${API_BASE}/api/recruiter/interviews/${id}`, {
    method: "DELETE",
    headers,
  });
  return res.ok;
};

export const loadRecruiterSettings = async (): Promise<RecruiterSettings> => {
  const headers = getAuthHeaders();
  const cached = readSettingsCache();
  if (!headers) return cached || defaultSettings;
  const res = await fetch(`${API_BASE}/api/recruiter/settings`, { headers });
  if (!res.ok) return cached || defaultSettings;
  const data = await res.json();
  const resolved = data.settings || cached || defaultSettings;
  writeSettingsCache(resolved);
  return resolved;
};

export const saveRecruiterSettings = async (settings: RecruiterSettings): Promise<RecruiterSettings> => {
  writeSettingsCache(settings);
  const headers = getAuthHeaders();
  if (!headers) return settings;
  const res = await fetch(`${API_BASE}/api/recruiter/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(settings),
  });
  if (!res.ok) return settings;
  const data = await res.json();
  const resolved = data.settings || settings;
  writeSettingsCache(resolved);
  return resolved;
};

export { defaultSettings };
