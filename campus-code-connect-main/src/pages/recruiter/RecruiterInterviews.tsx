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
  addRecruiterInterview,
  deleteRecruiterInterview,
  loadRecruiterInterviews,
  updateRecruiterInterview,
  type RecruiterInterview,
} from "@/lib/recruiterStorage";

const RecruiterInterviews = () => {
  const { toast } = useToast();
  const [interviews, setInterviews] = useState<RecruiterInterview[]>([]);
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
    fetchInterviews();
  }, []);

  const handleAddInterview = async () => {
    if (!form.candidateName.trim()) {
      toast({ title: "Candidate required", description: "Add a candidate name.", variant: "destructive" });
      return;
    }

    const newInterview = await addRecruiterInterview({
      candidateName: form.candidateName.trim(),
      jobTitle: form.jobTitle.trim(),
      interviewer: form.interviewer.trim(),
      date: form.date || null,
      time: form.time || null,
      location: form.location.trim(),
      status: form.status,
      notes: form.notes.trim(),
    });

    if (!newInterview) {
      toast({ title: "Schedule failed", description: "Could not save interview.", variant: "destructive" });
      return;
    }

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
    toast({ title: "Interview scheduled", description: "Interview added to the calendar." });
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
              <Input
                placeholder="Candidate name"
                value={form.candidateName}
                onChange={(e) => setForm((prev) => ({ ...prev, candidateName: e.target.value }))}
              />
              <Input
                placeholder="Job title"
                value={form.jobTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
              />
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
