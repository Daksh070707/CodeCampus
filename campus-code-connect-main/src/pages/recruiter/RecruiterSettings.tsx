import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Plus, Trash2, Users } from "lucide-react";
import RecruiterLayout from "@/components/layout/RecruiterLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { saveRecruiterSettings } from "@/lib/recruiterStorage";

type TeamMember = { id: string; name: string; role: string; email: string };

const normalizeTeamMembers = (members: any[]): TeamMember[] => {
  if (!Array.isArray(members)) return [];
  return members
    .map((member) => {
      const name = (member?.name ?? member?.fullName ?? member?.teammateName ?? "").toString().trim();
      const email = (member?.email ?? "").toString().trim();
      const role = (member?.role ?? member?.title ?? "").toString().trim();
      const id = (member?.id ?? crypto.randomUUID()).toString();
      return { id, name, role, email };
    })
    .filter((member) => member.name || member.email);
};

const RecruiterSettings = () => {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    interviewReminders: true,
    dailyDigest: false,
  });
  const [defaultPipeline, setDefaultPipeline] = useState<string[]>(["New", "Screen", "Interview", "Offer", "Hired"]);
  const [newMember, setNewMember] = useState({ name: "", role: "", email: "" });
  const [newStage, setNewStage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { loadRecruiterSettings } = await import("@/lib/recruiterStorage");
      const settings = await loadRecruiterSettings();
      setTeamMembers(normalizeTeamMembers(settings.teamMembers));
      setNotifications(settings.notifications);
      setDefaultPipeline(settings.defaultPipeline);
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const result = await saveRecruiterSettings({
      teamMembers,
      notifications,
      defaultPipeline,
    });
    if (result) {
      toast({ title: "Settings saved", description: "Recruiter preferences updated." });
    } else {
      toast({ title: "Save failed", description: "Could not save settings.", variant: "destructive" });
    }
  };

  const handleAddMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) {
      toast({ title: "Member required", description: "Add name and email.", variant: "destructive" });
      return;
    }
    const next = [
      { id: crypto.randomUUID(), name: newMember.name.trim(), role: newMember.role.trim(), email: newMember.email.trim() },
      ...teamMembers,
    ];
    setTeamMembers(next);
    setNewMember({ name: "", role: "", email: "" });

    saveRecruiterSettings({
      teamMembers: next,
      notifications,
      defaultPipeline,
    }).then((saved) => {
      setTeamMembers(normalizeTeamMembers(saved.teamMembers));
    });
  };

  const handleRemoveMember = (id: string) => {
    const next = teamMembers.filter((member) => member.id !== id);
    setTeamMembers(next);

    saveRecruiterSettings({
      teamMembers: next,
      notifications,
      defaultPipeline,
    }).then((saved) => {
      setTeamMembers(normalizeTeamMembers(saved.teamMembers));
    });
  };

  const handleAddStage = () => {
    const value = newStage.trim();
    if (!value) return;
    if (defaultPipeline.includes(value)) {
      setNewStage("");
      return;
    }
    setDefaultPipeline((prev) => [...prev, value]);
    setNewStage("");
  };

  const handleRemoveStage = (stage: string) => {
    setDefaultPipeline((prev) => prev.filter((item) => item !== stage));
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
            <h1 className="text-3xl font-semibold">Recruiter Settings</h1>
            <p className="text-muted-foreground">Manage your team and notification preferences.</p>
          </div>
          <Button variant="recruiter" onClick={handleSave}>Save changes</Button>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Users className="w-5 h-5 text-recruiter" />
              <CardTitle>Team management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <Input
                  placeholder="Name"
                  value={newMember.name}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Role"
                  value={newMember.role}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, role: e.target.value }))}
                />
                <Input
                  placeholder="Email"
                  value={newMember.email}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <Button variant="outline" onClick={handleAddMember}>
                <Plus className="w-4 h-4 mr-2" />
                Add teammate
              </Button>

              <div className="space-y-3">
                {teamMembers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No teammates added yet.</div>
                ) : (
                  teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.role || "Recruiter"}</div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <Mail className="w-5 h-5 text-recruiter" />
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <label className="flex items-center justify-between">
                  <span>Email updates for new applicants</span>
                  <input
                    type="checkbox"
                    checked={notifications.emailUpdates}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, emailUpdates: e.target.checked }))}
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>Interview reminders</span>
                  <input
                    type="checkbox"
                    checked={notifications.interviewReminders}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, interviewReminders: e.target.checked }))}
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>Daily digest</span>
                  <input
                    type="checkbox"
                    checked={notifications.dailyDigest}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, dailyDigest: e.target.checked }))}
                  />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Default pipeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {defaultPipeline.map((stage) => (
                    <Badge key={stage} variant="outline" className="text-xs">
                      {stage}
                      <button className="ml-2 text-xs" onClick={() => handleRemoveStage(stage)}>
                        x
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add stage"
                    value={newStage}
                    onChange={(e) => setNewStage(e.target.value)}
                  />
                  <Button variant="outline" onClick={handleAddStage}>Add</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterSettings;
