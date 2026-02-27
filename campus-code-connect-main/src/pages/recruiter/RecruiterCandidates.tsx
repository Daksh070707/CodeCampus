import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Filter, MessageSquare, Search, Star, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import RecruiterLayout from "@/components/layout/RecruiterLayout";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadSavedCandidates, toggleSavedCandidate } from "@/lib/recruiterStorage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const RecruiterCandidates = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [shortlistingId, setShortlistingId] = useState<string | null>(null);
  const [savedCandidateIds, setSavedCandidateIds] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(searchParams.get("view") === "saved");
  const [onlyWithEmail, setOnlyWithEmail] = useState(false);

  const filteredCandidates = useMemo(() => {
    if (!search) return candidates;
    const term = search.toLowerCase();
    return candidates.filter((candidate) =>
      [candidate.name, candidate.college, candidate.email].some((field: string) =>
        (field || "").toLowerCase().includes(term)
      )
    );
  }, [candidates, search]);

  const visibleCandidates = useMemo(() => {
    const base = showSavedOnly
      ? filteredCandidates.filter((candidate) => savedCandidateIds.includes(String(candidate.id)))
      : filteredCandidates;
    return onlyWithEmail ? base.filter((candidate) => Boolean(candidate.email)) : base;
  }, [filteredCandidates, savedCandidateIds, showSavedOnly, onlyWithEmail]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const [candRes, jobsRes] = await Promise.all([
        fetch(`${API_BASE}/api/recruiter/candidates`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/recruiter/jobs`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (candRes.ok) {
        const data = await candRes.json();
        setCandidates(data.candidates || []);
      }

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
        if (!selectedJobId && data.jobs?.[0]?.id) {
          setSelectedJobId(String(data.jobs[0].id));
        }
      }
    } catch (e) {
      toast({ title: "Candidates failed", description: "Unable to load talent.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const fetchSaved = async () => {
      const ids = await loadSavedCandidates();
      setSavedCandidateIds(ids);
    };
    fetchSaved();
  }, []);

  useEffect(() => {
    const isSavedView = searchParams.get("view") === "saved";
    setShowSavedOnly(isSavedView);
  }, [searchParams]);

  const handleShortlist = async (candidateId: string) => {
    if (!selectedJobId) {
      toast({ title: "Select a job", description: "Pick a job to shortlist into.", variant: "destructive" });
      return;
    }

    setShortlistingId(candidateId);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/recruiter/applicants`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidate_id: candidateId, job_id: selectedJobId, status: "New" }),
      });
      if (!res.ok) throw new Error("Failed to shortlist");
      toast({ title: "Shortlisted", description: "Candidate added to pipeline." });
    } catch (e) {
      toast({ title: "Shortlist failed", description: "Could not add candidate.", variant: "destructive" });
    } finally {
      setShortlistingId(null);
    }
  };

  const handleToggleSaved = async (candidateId: string) => {
    const id = String(candidateId);
    try {
      const next = await toggleSavedCandidate(id, savedCandidateIds.includes(id));
      setSavedCandidateIds(next);
    } catch (e) {
      toast({ title: "Save failed", description: "Unable to update saved list.", variant: "destructive" });
    }
  };

  const handleMessage = async (candidate: any) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: candidate.name || "Candidate",
          participantIds: [candidate.id],
        }),
      });
      if (!res.ok) throw new Error("Failed to start conversation");
      const data = await res.json();
      const convId = data?.conversation?.id;
      navigate(convId ? `/recruiter/messages?conv=${convId}` : "/recruiter/messages");
    } catch (error) {
      toast({ title: "Message failed", description: "Could not start conversation.", variant: "destructive" });
      navigate("/recruiter/messages");
    }
  };

  const toggleSavedView = () => {
    const next = !showSavedOnly;
    setShowSavedOnly(next);
    if (next) {
      setSearchParams({ view: "saved" });
    } else {
      setSearchParams({});
    }
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
            <h1 className="text-3xl font-semibold">Candidate Search</h1>
            <p className="text-muted-foreground">Discover talent that matches your open roles.</p>
          </div>
          <Button variant="outline" onClick={toggleSavedView}>
            Saved Lists
          </Button>
        </motion.div>

        <motion.div
          className="flex flex-col lg:flex-row gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, school" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue placeholder="Select job" />
            </SelectTrigger>
            <SelectContent>
              {jobs.length === 0 ? (
                <SelectItem value="no-jobs" disabled>
                  No jobs
                </SelectItem>
              ) : (
                jobs.map((job) => (
                  <SelectItem key={job.id} value={String(job.id)}>
                    {job.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setOnlyWithEmail((prev) => !prev)}>
            <Filter className="w-4 h-4 mr-2" />
            {onlyWithEmail ? "All profiles" : "Email only"}
          </Button>
        </motion.div>

        <div className="grid gap-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading candidates...</div>
          ) : visibleCandidates.length === 0 ? (
            <div className="text-sm text-muted-foreground">No candidates found.</div>
          ) : visibleCandidates.map((candidate, index) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-recruiter/20 flex items-center justify-center">
                          <Star className="w-5 h-5 text-recruiter" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold">{candidate.name}</div>
                          <div className="text-sm text-muted-foreground">{candidate.role || "Student"}</div>
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-muted-foreground">{candidate.college || ""}</div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="skill" className="text-xs">{candidate.email || ""}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleMessage(candidate)}>
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleSaved(candidate.id)}
                      >
                        <Bookmark className="w-4 h-4 mr-1" />
                        {savedCandidateIds.includes(String(candidate.id)) ? "Saved" : "Save"}
                      </Button>
                      <Button
                        variant="recruiter"
                        size="sm"
                        onClick={() => handleShortlist(candidate.id)}
                        disabled={shortlistingId === candidate.id}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        {shortlistingId === candidate.id ? "Adding..." : "Shortlist"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterCandidates;
