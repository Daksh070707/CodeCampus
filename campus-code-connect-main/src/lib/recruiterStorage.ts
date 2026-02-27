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
  interview: Omit<RecruiterInterview, "id" | "createdAt">
): Promise<RecruiterInterview | null> => {
  const headers = getAuthHeaders();
  if (!headers) return null;
  const res = await fetch(`${API_BASE}/api/recruiter/interviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(interview),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.interview || null;
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
  if (!headers) return defaultSettings;
  const res = await fetch(`${API_BASE}/api/recruiter/settings`, { headers });
  if (!res.ok) return defaultSettings;
  const data = await res.json();
  return data.settings || defaultSettings;
};

export const saveRecruiterSettings = async (settings: RecruiterSettings): Promise<RecruiterSettings> => {
  const headers = getAuthHeaders();
  if (!headers) return settings;
  const res = await fetch(`${API_BASE}/api/recruiter/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(settings),
  });
  if (!res.ok) return settings;
  const data = await res.json();
  return data.settings || settings;
};

export { defaultSettings };
