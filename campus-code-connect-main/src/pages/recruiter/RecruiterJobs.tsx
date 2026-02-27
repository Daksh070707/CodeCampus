import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Edit,
  Filter,
  MapPin,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RecruiterLayout from "@/components/layout/RecruiterLayout";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const RecruiterJobs = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [newJob, setNewJob] = useState({
    title: "",
    team: "",
    company: "",
    location: "",
    type: "Full-time",
    salary: "",
    deadline: "",
    status: "Open",
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);

  const filteredJobs = useMemo(() => {
    const base = showOpenOnly ? jobs.filter((job) => job.status !== "Closed") : jobs;
    if (!search) return base;
    const term = search.toLowerCase();
    return base.filter((job) =>
      [job.title, job.team, job.company, job.location].some((field) =>
        (field || "").toLowerCase().includes(term)
      )
    );
  }, [jobs, search, showOpenOnly]);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("[RECRUITER_JOBS] No token found");
        setError("Not authenticated. Please sign in.");
        return;
      }
      console.log("[RECRUITER_JOBS] Loading jobs from:", `${API_BASE}/api/recruiter/jobs`);
      const res = await fetch(`${API_BASE}/api/recruiter/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[RECRUITER_JOBS] Response status:", res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log("[RECRUITER_JOBS] Loaded", (data.jobs || []).length, "jobs");
      setJobs(data.jobs || []);
      setError(null);
    } catch (e) {
      const message = (e as Error).message || "Unable to load jobs.";
      console.error("[RECRUITER_JOBS] Error:", e);
      setError(message);
      toast({ title: "Jobs failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleCreateJob = async () => {
    if (!newJob.title.trim()) {
      toast({ title: "Title required", description: "Add a job title.", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("[RECRUITER_JOBS_CREATE] No token found");
        toast({ title: "Auth required", description: "Please sign in first.", variant: "destructive" });
        return;
      }
      const endpoint = editingJobId
        ? `${API_BASE}/api/recruiter/jobs/${editingJobId}`
        : `${API_BASE}/api/recruiter/jobs`;
      const method = editingJobId ? "PUT" : "POST";
      console.log("[RECRUITER_JOBS_CREATE]", method, "to", endpoint);
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newJob),
      });
      console.log("[RECRUITER_JOBS_CREATE] Response status:", res.status);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.job) {
        setJobs((prev) =>
          editingJobId
            ? prev.map((job) => (job.id === data.job.id ? data.job : job))
            : [data.job, ...prev]
        );
      }
      setNewJob({
        title: "",
        team: "",
        company: "",
        location: "",
        type: "Full-time",
        salary: "",
        deadline: "",
        status: "Open",
        description: "",
      });
      setEditingJobId(null);
      toast({
        title: editingJobId ? "Job updated" : "Job created",
        description: editingJobId ? "Your role has been updated." : "Your role is now live.",
      });
    } catch (e) {
      console.error("[RECRUITER_JOBS_CREATE] Error:", e);
      toast({ title: "Job save failed", description: (e as Error).message || "Please try again.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditJob = (job: any) => {
    setEditingJobId(String(job.id));
    setNewJob({
      title: job.title || "",
      team: job.team || "",
      company: job.company || "",
      location: job.location || "",
      type: job.type || "Full-time",
      salary: job.salary || "",
      deadline: job.deadline || "",
      status: job.status || "Open",
      description: job.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetEdit = () => {
    setEditingJobId(null);
    setNewJob({
      title: "",
      team: "",
      company: "",
      location: "",
      type: "Full-time",
      salary: "",
      deadline: "",
      status: "Open",
      description: "",
    });
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
            <h1 className="text-3xl font-semibold">Jobs</h1>
            <p className="text-muted-foreground">Create roles, manage applicants, and track progress.</p>
          </div>
          <Button variant="recruiter" onClick={handleCreateJob} disabled={isCreating}>
            <Plus className="w-4 h-4 mr-2" />
            {isCreating ? "Saving..." : editingJobId ? "Update Job" : "Post Job"}
          </Button>
        </motion.div>

        {editingJobId ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Editing job details. If you want to start fresh,
            <Button variant="link" className="px-1" onClick={resetEdit}>
              reset the form
            </Button>
            .
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Quick Post</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Job title"
                value={newJob.title}
                onChange={(e) => setNewJob((prev) => ({ ...prev, title: e.target.value }))}
              />
              <Input
                placeholder="Team"
                value={newJob.team}
                onChange={(e) => setNewJob((prev) => ({ ...prev, team: e.target.value }))}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Company"
                value={newJob.company}
                onChange={(e) => setNewJob((prev) => ({ ...prev, company: e.target.value }))}
              />
              <Input
                placeholder="Location"
                value={newJob.location}
                onChange={(e) => setNewJob((prev) => ({ ...prev, location: e.target.value }))}
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Select value={newJob.type} onValueChange={(value) => setNewJob((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Internship">Internship</SelectItem>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                </SelectContent>
              </Select>
              <Select value={newJob.status} onValueChange={(value) => setNewJob((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Screen">Screen</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Salary"
                value={newJob.salary}
                onChange={(e) => setNewJob((prev) => ({ ...prev, salary: e.target.value }))}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Deadline"
                value={newJob.deadline}
                onChange={(e) => setNewJob((prev) => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
            <Textarea
              placeholder="Role description"
              className="min-h-[120px]"
              value={newJob.description}
              onChange={(e) => setNewJob((prev) => ({ ...prev, description: e.target.value }))}
            />
          </CardContent>
        </Card>

        <motion.div
          className="flex flex-col lg:flex-row gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search roles or teams" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setShowOpenOnly((prev) => !prev)}>
            <Filter className="w-4 h-4 mr-2" />
            {showOpenOnly ? "All roles" : "Open only"}
          </Button>
        </motion.div>

        <div className="grid gap-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">Error: {error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={loadJobs}
                className="mt-2"
              >
                Retry Loading
              </Button>
            </div>
          )}
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading jobs...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No jobs yet.</div>
          ) : filteredJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold">{job.title}</h3>
                        <Badge variant="outline" className="text-xs">{job.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{job.team}</div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {job.applicants || 0} applicants
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="recruiter" className="text-xs">{job.status || "Open"}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/recruiter/applicants?jobId=${job.id}`)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditJob(job)}>
                        <Edit className="w-4 h-4" />
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

export default RecruiterJobs;
