import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, User, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import RecruiterLayout from "@/components/layout/RecruiterLayout";
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
import {
  addRecruiterInterview,
  deleteRecruiterInterview,
  loadRecruiterInterviews,
  updateRecruiterInterview,
  type RecruiterInterview,
} from "@/lib/recruiterStorage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

type CandidateOption = {
  applicationId: string;
  candidateId: string;
  jobId: string;
  label: string;
  suggestedJobTitle: string;
};

type JobOption = {
  id: string;
  title: string;
};

const RecruiterInterviews = () => {
  const { toast } = useToast();
  const [interviews, setInterviews] = useState<RecruiterInterview[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [candidateOptions, setCandidateOptions] = useState<CandidateOption[]>([]);
  const [jobOptions, setJobOptions] = useState<JobOption[]>([]);
  const [selectedCandidateOption, setSelectedCandidateOption] = useState<CandidateOption | null>(null);
  const [form, setForm] = useState({
    candidateName: "",
    jobTitle: "",
    interviewer: "",
    date: "",
    time: "",
    location: "",
    status: "Scheduled" as RecruiterInterview["status"],
    notes: "",
  });

  useEffect(() => {
    const fetchInterviews = async () => {
      const data = await loadRecruiterInterviews();
      setInterviews(data);
    };

    const fetchOptions = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      setLoadingOptions(true);
      try {
        const [jobsRes, applicantsRes] = await Promise.all([
          fetch(`${API_BASE}/api/recruiter/jobs`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/recruiter/applicants`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const jobsData = await jobsRes.json().catch(() => ({}));
        const applicantsData = await applicantsRes.json().catch(() => ({}));

        if (!jobsRes.ok) {
          console.error("[JOBS] API error:", jobsRes.status, jobsData);
          toast({ title: "Load failed", description: jobsData.message || "Unable to load jobs", variant: "destructive" });
        } else {
          const jobs = (jobsData.jobs || []).map((job: any) => ({
            id: String(job.id),
            title: job.title || "Untitled Job",
          }));
          setJobOptions(jobs);
        }

        if (!applicantsRes.ok) {
          console.error("[APPLICANTS] API error:", applicantsRes.status, applicantsData);
          toast({ title: "Load failed", description: applicantsData.message || "Unable to load shortlisted students", variant: "destructive" });
        } else {
          const rows = applicantsData.applicants || [];
          console.log("[CANDIDATES] Total applicants:", rows.length);

          const shortlisted = rows.filter((row: any) => {
            const status = String(row.status || "").toLowerCase();
            return status === "shortlisted" || status === "interview" || status === "offer";
          });

          console.log("[CANDIDATES] Shortlisted count:", shortlisted.length);

          const fallbackRows = shortlisted.length > 0
            ? shortlisted
            : rows.filter((row: any) => String(row.status || "").toLowerCase() !== "new");

          console.log("[CANDIDATES] Final rows to process:", fallbackRows.length);

          const candidates = fallbackRows.map((row: any) => ({
            applicationId: String(row.id || ""),
            candidateId: String(row?.candidate?.id || ""),
            jobId: String(row?.job?.id || ""),
            label: row?.candidate?.name || "Unnamed Candidate",
            suggestedJobTitle: row?.job?.title || "",
          }));

          console.log("[CANDIDATES] Mapped candidates:", candidates);

          const dedupedByName = Array.from(
            new Map(candidates.map((c: CandidateOption) => [c.label.toLowerCase(), c])).values()
          ) as CandidateOption[];

          console.log("[CANDIDATES] Final deduped options:", dedupedByName.length);
          setCandidateOptions(dedupedByName);
        }
      } catch (error) {
        console.error("[FETCH_OPTIONS] Exception:", error);
        toast({ title: "Load failed", description: "Unable to load shortlist/job options", variant: "destructive" });
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchInterviews();
    fetchOptions();
  }, []);

  const handleAddInterview = async () => {
    if (!form.candidateName.trim()) {
      toast({ title: "Candidate required", description: "Select a shortlisted candidate.", variant: "destructive" });
      return;
    }

    if (!form.jobTitle.trim()) {
      toast({ title: "Job required", description: "Select a job title.", variant: "destructive" });
      return;
    }

    try {
      const newInterview = await addRecruiterInterview({
        candidateName: form.candidateName.trim(),
        jobTitle: form.jobTitle.trim(),
        interviewer: form.interviewer.trim(),
        date: form.date || null,
        time: form.time || null,
        location: form.location.trim(),
        status: form.status,
        notes: form.notes.trim(),
        applicationId: selectedCandidateOption?.applicationId,
        candidateId: selectedCandidateOption?.candidateId,
        jobId: selectedCandidateOption?.jobId,
      });

      setInterviews((prev) => [newInterview, ...prev]);
      setForm({
        candidateName: "",
        jobTitle: "",
        interviewer: "",
        date: "",
        time: "",
        location: "",
        status: "Scheduled",
        notes: "",
      });
      setSelectedCandidateOption(null);
      toast({ title: "Interview scheduled", description: "Interview added to the calendar." });
    } catch (error) {
      toast({
        title: "Schedule failed",
        description: (error as Error).message || "Could not save interview.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (id: string, status: RecruiterInterview["status"]) => {
    const updated = await updateRecruiterInterview(id, { status });
    if (updated) {
      setInterviews((prev) => prev.map((item) => (item.id === id ? updated : item)));
    }
  };

  const handleRemove = async (id: string) => {
    const success = await deleteRecruiterInterview(id);
    if (success) {
      setInterviews((prev) => prev.filter((item) => item.id !== id));
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
            <h1 className="text-3xl font-semibold">Interview Scheduling</h1>
            <p className="text-muted-foreground">Coordinate interviews and keep the loop tight.</p>
          </div>
          <Button variant="recruiter" onClick={handleAddInterview}>Add Interview</Button>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle>Schedule new interview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Select
                value={selectedCandidateOption?.applicationId || undefined}
                onValueChange={(value) => {
                  const selected = candidateOptions.find((item) => item.applicationId === value);
                  setSelectedCandidateOption(selected || null);
                  setForm((prev) => ({
                    ...prev,
                    candidateName: selected?.label || "",
                    jobTitle: prev.jobTitle || selected?.suggestedJobTitle || "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingOptions ? "Loading shortlisted students..." : "Select shortlisted student"} />
                </SelectTrigger>
                <SelectContent>
                  {candidateOptions.map((candidate) => (
                    <SelectItem key={candidate.applicationId} value={candidate.applicationId}>
                      {candidate.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={form.jobTitle || undefined}
                onValueChange={(value) => setForm((prev) => ({ ...prev, jobTitle: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingOptions ? "Loading posted jobs..." : "Select posted job"} />
                </SelectTrigger>
                <SelectContent>
                  {jobOptions.map((job) => (
                    <SelectItem key={job.id} value={job.title}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Input
                placeholder="Interviewer"
                value={form.interviewer}
                onChange={(e) => setForm((prev) => ({ ...prev, interviewer: e.target.value }))}
              />
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Location or meeting link"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            />
            <Textarea
              placeholder="Notes"
              className="min-h-[100px]"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {interviews.length === 0 ? (
            <div className="text-sm text-muted-foreground">No interviews scheduled yet.</div>
          ) : (
            interviews.map((interview, index) => (
              <motion.div
                key={interview.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 + index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-semibold">{interview.candidateName}</div>
                          <Badge variant="outline" className="text-xs">{interview.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{interview.jobTitle || "Interview"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(interview.id, "Completed")}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(interview.id, "Canceled")}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(interview.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {interview.date || "TBD"} {interview.time ? `at ${interview.time}` : ""}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {interview.interviewer || "Interviewer TBD"}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {interview.location || "Location TBD"}
                      </div>
                    </div>

                    {interview.notes ? (
                      <div className="text-sm text-muted-foreground">{interview.notes}</div>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterInterviews;
