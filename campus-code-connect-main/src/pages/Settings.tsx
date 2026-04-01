import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, Shield, Sliders, Save, HelpCircle, MessageSquare, FileText, ExternalLink, ChevronDown } from "lucide-react";
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
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

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

  const faqs = [
    {
      question: "How do I create my profile?",
      answer: "Go to your profile settings and fill in your details including bio, skills, and experience. You can add a profile picture and update your information anytime."
    },
    {
      question: "How do I search and apply for jobs?",
      answer: "Navigate to the Jobs section to browse available positions. Filter by company, location, or skills. Click on a job to see details and click 'Apply' to submit your application."
    },
    {
      question: "Can I connect with other students?",
      answer: "Yes! Use the Connections feature to find and connect with other students. You can view their profiles, see mutual connections, and send messages."
    },
    {
      question: "How do I post to the feed?",
      answer: "Go to the Feed section and click 'Create Post'. Add a title, description, and optionally code snippets or tags. Click 'Post' to share with the community."
    },
    {
      question: "How do I use the messaging feature?",
      answer: "Click on Conversations in the sidebar to view your messages. Select a conversation to chat or create a new message. You can send text, images, and files."
    },
    {
      question: "How can I report inappropriate content?",
      answer: "Click the three dots menu on any post or message and select 'Report'. Choose a reason and submit. Our team will review it within 24 hours."
    },
    {
      question: "Is my data secure?",
      answer: "We use industry-standard encryption and security practices. Your personal data is never shared with third parties without your consent."
    },
    {
      question: "How do I delete my account?",
      answer: "Go to Settings and scroll to the Account section. Click 'Delete Account' to permanently remove your profile and all associated data."
    }
  ];

  const navigate = useNavigate();

  const handleContactSupport = () => {
    toast({ title: "Redirecting", description: "Opening Help & Support documentation..." });
    navigate("/docs");
  };

  const handleFeedback = () => {
    toast({ title: "Redirecting", description: "Taking you to the feedback form..." });
    navigate("/docs");
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

        {/* Help & Support Section */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <HelpCircle className="w-5 h-5 text-recruiter" />
            <CardTitle>Help & Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Links */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Quick Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={handleContactSupport}
                >
                  <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Contact Support</div>
                    <div className="text-xs text-muted-foreground">Email us your questions</div>
                  </div>
                  <ExternalLink className="w-4 h-4 ml-auto flex-shrink-0" />
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={handleFeedback}
                >
                  <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Send Feedback</div>
                    <div className="text-xs text-muted-foreground">Help us improve</div>
                  </div>
                  <ExternalLink className="w-4 h-4 ml-auto flex-shrink-0" />
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => window.open("/docs", "_blank")}
                >
                  <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Documentation</div>
                    <div className="text-xs text-muted-foreground">Learn how to use features</div>
                  </div>
                  <ExternalLink className="w-4 h-4 ml-auto flex-shrink-0" />
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => window.open("https://github.com/codecampus/issues", "_blank")}
                >
                  <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-medium text-sm">Report Bug</div>
                    <div className="text-xs text-muted-foreground">Found an issue?</div>
                  </div>
                  <ExternalLink className="w-4 h-4 ml-auto flex-shrink-0" />
                </Button>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="space-y-3 border-t pt-6">
              <h3 className="font-semibold text-sm">Frequently Asked Questions</h3>
              <div className="space-y-2">
                {faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="border border-border rounded-lg overflow-hidden"
                  >
                    <button
                      className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                      onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
                    >
                      <span className="font-medium text-sm text-left">{faq.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${
                          expandedFAQ === idx ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {expandedFAQ === idx && (
                      <div className="px-4 py-3 bg-secondary/30 border-t border-border">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Support Info */}
            <div className="border-t pt-6 space-y-3">
              <h3 className="font-semibold text-sm">Need More Help?</h3>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Response Time</p>
                <p className="text-sm text-muted-foreground">
                  We typically respond to support requests within 24 hours during business days.
                </p>
              </div>
            </div>

            {/* Version & Info */}
            <div className="border-t pt-6 text-xs text-muted-foreground space-y-1">
              <p>Platform Version: 2.0.0</p>
              <p>Last Updated: {new Date().toLocaleDateString()}</p>
              <p className="text-xs">© 2024 CodeCampus. All rights reserved.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
