import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  ChevronRight,
  Filter,
  MessageSquare,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import RecruiterLayout from "@/components/layout/RecruiterLayout";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addRecruiterInterview } from "@/lib/recruiterStorage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const stages = ["New", "Screen", "Interview", "Offer", "Hired"];

type Applicant = {
  id: string;
  status: string;
  candidate?: { id: string; name?: string; role?: string; college?: string; avatar_url?: string };
  job?: { id: string; title?: string; team?: string };
};

const RecruiterApplicants = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const jobFilterId = searchParams.get("jobId");

  const filteredApplicants = useMemo(() => {
    const base = jobFilterId
      ? applicants.filter((app) => String(app.job?.id || "") === jobFilterId)
      : applicants;
    const stageFiltered = showActiveOnly ? base.filter((app) => app.status !== "Hired") : base;

    if (!search) return stageFiltered;
    const term = search.toLowerCase();
    return stageFiltered.filter((app) => {
      const name = app.candidate?.name || "";
      const role = app.job?.title || "";
      return name.toLowerCase().includes(term) || role.toLowerCase().includes(term);
    });
  }, [applicants, search, jobFilterId, showActiveOnly]);

  const loadApplicants = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("[RECRUITER_APPLICANTS] No token found");
        setError("Not authenticated. Please sign in.");
        return;
      }
      console.log("[RECRUITER_APPLICANTS] Loading applicants from:", `${API_BASE}/api/recruiter/applicants`);
      const res = await fetch(`${API_BASE}/api/recruiter/applicants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[RECRUITER_APPLICANTS] Response status:", res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log("[RECRUITER_APPLICANTS] Loaded", (data.applicants || []).length, "applicants");
      setApplicants(data.applicants || []);
      setError(null);
    } catch (e) {
      const message = (e as Error).message || "Unable to load pipeline.";
      console.error("[RECRUITER_APPLICANTS] Error:", e);
      setError(message);
      toast({ title: "Applicants failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplicants();
  }, []);

  const handleAdvanceStage = async (applicant: Applicant) => {
    const currentIndex = stages.indexOf(applicant.status || "New");
    const nextStage = stages[Math.min(currentIndex + 1, stages.length - 1)];
    if (!nextStage || nextStage === applicant.status) {
      toast({ title: "No next stage", description: "This applicant is already at the final stage.", variant: "destructive" });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("[RECRUITER_ADVANCE_STAGE] No token found");
        toast({ title: "Auth required", description: "Please sign in first.", variant: "destructive" });
        return;
      }
      console.log("[RECRUITER_ADVANCE_STAGE] Updating applicant", applicant.id, "to stage", nextStage);
      const res = await fetch(`${API_BASE}/api/recruiter/applicants/${applicant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStage }),
      });
      console.log("[RECRUITER_ADVANCE_STAGE] Response status:", res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      setApplicants((prev) => prev.map((item) => (item.id === applicant.id ? { ...item, status: nextStage } : item)));
      toast({ title: "Stage updated", description: `Moved to ${nextStage}.` });
    } catch (e) {
      console.error("[RECRUITER_ADVANCE_STAGE] Error:", e);
      toast({ title: "Update failed", description: (e as Error).message || "Could not update stage.", variant: "destructive" });
    }
  };

  const handleMessage = async (applicant: Applicant) => {
    if (!applicant.candidate?.id) {
      toast({ title: "No candidate", description: "Could not find candidate info.", variant: "destructive" });
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("[RECRUITER_MESSAGE] No token found");
      toast({ title: "Auth required", description: "Please sign in first.", variant: "destructive" });
      return;
    }
    try {
      console.log("[RECRUITER_MESSAGE] Creating conversation with candidate", applicant.candidate.id);
      const res = await fetch(`${API_BASE}/api/messages/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: applicant.candidate?.name || "Candidate",
          participantIds: [applicant.candidate.id],
        }),
      });
      console.log("[RECRUITER_MESSAGE] Response status:", res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const convId = data?.conversation?.id;
      console.log("[RECRUITER_MESSAGE] Navigating to conversation:", convId);
      navigate(convId ? `/recruiter/messages?conv=${convId}` : "/recruiter/messages");
    } catch (error) {
      console.error("[RECRUITER_MESSAGE] Error:", error);
      toast({ title: "Message failed", description: (error as Error).message || "Could not start conversation.", variant: "destructive" });
      navigate("/recruiter/messages");
    }
  };

  const handleScheduleInterview = async (applicant: Applicant) => {
    try {
      const candidateName = applicant.candidate?.name || "Candidate";
      const jobTitle = applicant.job?.title || "";
      await addRecruiterInterview({
        candidateName,
        jobTitle,
        interviewer: "",
        date: null,
        time: null,
        location: "",
        status: "Scheduled",
        notes: "",
        applicationId: applicant.id,
        candidateId: applicant.candidate?.id,
        jobId: applicant.job?.id,
      });
      toast({ title: "Interview draft created", description: "Complete details in Interviews." });
      navigate("/recruiter/interviews");
    } catch (error) {
      toast({
        title: "Failed to create",
        description: (error as Error).message || "Could not create interview draft.",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const rows = [
      ["Candidate", "Job", "Stage", "College"],
      ...filteredApplicants.map((app) => [
        app.candidate?.name || "",
        app.job?.title || "",
        app.status || "",
        app.candidate?.college || "",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "applicant-pipeline.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <RecruiterLayout>
      <div className="space-y-6">
        <motion.div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-3xl font-semibold">Applicant Pipeline</h1>
            <p className="text-muted-foreground">Track candidates from application to offer.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>Export</Button>
            <Button variant="recruiter" onClick={() => navigate("/recruiter/candidates")}>Add Candidate</Button>
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col lg:flex-row gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {error && (
            <div className="w-full bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">Error: {error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={loadApplicants}
                className="mt-2"
              >
                Retry Loading
              </Button>
            </div>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search applicants" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setShowActiveOnly((prev) => !prev)}>
            <Filter className="w-4 h-4 mr-2" />
            {showActiveOnly ? "All stages" : "Active only"}
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-4">
          {stages.map((stage) => (
            <Card key={stage} className="bg-secondary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{stage}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-xs text-muted-foreground">Loading...</div>
                ) : filteredApplicants.filter((app) => app.status === stage).length === 0 ? (
                  <div className="text-xs text-muted-foreground">No candidates</div>
                ) : (
                  filteredApplicants
                    .filter((app) => app.status === stage)
                    .map((applicant) => (
                      <div key={applicant.id} className="rounded-lg bg-background p-3 border border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{applicant.candidate?.name || "Candidate"}</div>
                            <div className="text-xs text-muted-foreground">{applicant.job?.title || ""}</div>
                          </div>
                          <Badge variant="recruiter" className="text-xs">{applicant.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">{applicant.candidate?.college || ""}</div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleMessage(applicant)}
                          >
                            <MessageSquare className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleScheduleInterview(applicant)}
                          >
                            <Calendar className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleAdvanceStage(applicant)}
                          >
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterApplicants;
