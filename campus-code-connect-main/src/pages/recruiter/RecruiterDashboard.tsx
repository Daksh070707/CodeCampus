import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Eye,
  MessageSquare,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RecruiterLayout from "@/components/layout/RecruiterLayout";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const stages = ["New", "Screen", "Interview", "Offer", "Hired"];

const RecruiterDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [overview, setOverview] = useState({ openRoles: 0, applicants: 0, interviews: 0, offers: 0 });
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [recentRoles, setRecentRoles] = useState<any[]>([]);
  const [priorityTasks, setPriorityTasks] = useState<any[]>([]);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/recruiter/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load overview");
        const data = await res.json();
        const ov = data.overview || {};
        setOverview({
          openRoles: ov.openRoles || 0,
          applicants: ov.applicants || 0,
          interviews: ov.interviews || 0,
          offers: ov.offers || 0,
        });
      } catch (e) {
        toast({ title: "Recruiter overview failed", description: "Please refresh.", variant: "destructive" });
      }
    };

    const loadApplicants = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/recruiter/applicants`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load applicants");
        const data = await res.json();
        const applicants = data.applicants || [];
        const pipelineCounts: Record<string, number> = {};
        stages.forEach((stage) => {
          pipelineCounts[stage] = applicants.filter((app: any) => app.status === stage).length;
        });
        setPipeline(pipelineCounts);

        const tasks = applicants.slice(0, 3).map((app: any) => ({
          title: `Review ${app.candidate?.name || "candidate"}`,
          due: "Today",
        }));
        setPriorityTasks(tasks);
      } catch (e) {
        setPipeline({});
      }
    };

    const loadJobs = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/recruiter/jobs`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load jobs");
        const data = await res.json();
        setRecentRoles((data.jobs || []).slice(0, 3));
      } catch (e) {
        setRecentRoles([]);
      }
    };

    loadOverview();
    loadApplicants();
    loadJobs();
  }, [toast]);

  const kpis = [
    { title: "Open Roles", value: String(overview.openRoles), change: "", icon: Briefcase },
    { title: "Applicants", value: String(overview.applicants), change: "", icon: Users },
    { title: "Interviews", value: String(overview.interviews), change: "", icon: ClipboardList },
    { title: "Offers", value: String(overview.offers), change: "", icon: MessageSquare },
  ];

  const handleExport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Open Roles", overview.openRoles],
      ["Applicants", overview.applicants],
      ["Interviews", overview.interviews],
      ["Offers", overview.offers],
      [""],
      ["Pipeline Stage", "Count"],
      ...stages.map((stage) => [stage, pipeline[stage] || 0]),
      [""],
      ["Recent Roles", "Status", "Applicants"],
      ...recentRoles.map((role) => [role.title, role.status || "Open", role.applicants || 0]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "recruiter-overview.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <RecruiterLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-semibold">Hiring Overview</h1>
            <p className="text-muted-foreground">Track pipeline activity and keep roles moving.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>Export Report</Button>
            <Button variant="recruiter" onClick={() => navigate("/recruiter/jobs")}>Create Job</Button>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {kpis.map((kpi) => (
            <Card key={kpi.title}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <kpi.icon className="w-5 h-5 text-recruiter" />
                  {kpi.change ? (
                    <Badge variant="success" className="text-xs">{kpi.change}</Badge>
                  ) : null}
                </div>
                <div className="text-2xl font-semibold mt-3">{kpi.value}</div>
                <div className="text-sm text-muted-foreground">{kpi.title}</div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pipeline Snapshot</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/recruiter/applicants")}>
                  View Pipeline
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {stages.map((stage) => (
                  <div key={stage} className="rounded-lg border border-border p-3">
                    <div className="text-sm text-muted-foreground">{stage}</div>
                    <div className="text-xl font-semibold mt-1">{pipeline[stage] || 0}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Priority Tasks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {priorityTasks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No tasks yet.</div>
                ) : priorityTasks.map((task) => (
                  <div key={task.title} className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-recruiter" />
                    <div>
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="text-xs text-muted-foreground">Due {task.due}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          className="grid lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Active Roles</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/recruiter/jobs")}>
                Manage Roles
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentRoles.length === 0 ? (
                <div className="text-sm text-muted-foreground">No roles yet.</div>
              ) : recentRoles.map((role) => (
                <div key={role.id || role.title} className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium">{role.title}</div>
                    <div className="text-xs text-muted-foreground">{role.team || role.company || ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{role.applicants || 0} applicants</div>
                    <Badge variant="outline" className="text-xs">{role.status || "Open"}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Talent Insights</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/recruiter/candidates")}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-recruiter" />
                <div>
                  <div className="text-sm font-medium">Top Source</div>
                  <div className="text-xs text-muted-foreground">Campus referrals drive 42 percent of hires.</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-recruiter" />
                <div>
                  <div className="text-sm font-medium">Most Viewed Role</div>
                  <div className="text-xs text-muted-foreground">Frontend Engineer leads with 1,204 views.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterDashboard;
