import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Shield, Sliders, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";

const SETTINGS_KEY = "userSettings";

const Settings = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [jobMatchAlerts, setJobMatchAlerts] = useState(true);
  const [messagePreview, setMessagePreview] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      setEmailAlerts(Boolean(parsed.emailAlerts));
      setPushAlerts(Boolean(parsed.pushAlerts));
      setPublicProfile(Boolean(parsed.publicProfile));
      setJobMatchAlerts(Boolean(parsed.jobMatchAlerts));
      setMessagePreview(Boolean(parsed.messagePreview));
    } catch (error) {
      // ignore malformed storage
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    const payload = {
      emailAlerts,
      pushAlerts,
      publicProfile,
      jobMatchAlerts,
      messagePreview,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Settings saved", description: "Your preferences are updated." });
    }, 400);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-semibold">Settings</h1>
            <p className="text-muted-foreground">Control notifications, privacy, and preferences.</p>
          </div>
          <Button variant="recruiter" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </motion.div>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Bell className="w-5 h-5 text-recruiter" />
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email alerts</div>
                <div className="text-sm text-muted-foreground">Weekly summary and account updates.</div>
              </div>
              <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Push notifications</div>
                <div className="text-sm text-muted-foreground">Mentions, messages, and reminders.</div>
              </div>
              <Switch checked={pushAlerts} onCheckedChange={setPushAlerts} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Job match alerts</div>
                <div className="text-sm text-muted-foreground">Get notified when new roles match your skills.</div>
              </div>
              <Switch checked={jobMatchAlerts} onCheckedChange={setJobMatchAlerts} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Shield className="w-5 h-5 text-recruiter" />
            <CardTitle>Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Public profile</div>
                <div className="text-sm text-muted-foreground">Allow others to view your profile.</div>
              </div>
              <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Message previews</div>
                <div className="text-sm text-muted-foreground">Show message previews in notifications.</div>
              </div>
              <Switch checked={messagePreview} onCheckedChange={setMessagePreview} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Sliders className="w-5 h-5 text-recruiter" />
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              More preference options will appear here as we add personalization controls.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
