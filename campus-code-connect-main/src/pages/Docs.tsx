import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Book,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Docs = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("getting-started");
  const [feedbackForm, setFeedbackForm] = useState({
    name: "",
    email: "",
    category: "general",
    message: "",
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const isAuthenticated = !!localStorage.getItem("token") || !!localStorage.getItem("user");

  const documentation = {
    "getting-started": {
      title: "Getting Started",
      icon: "🚀",
      sections: [
        {
          title: "Welcome to CodeCampus",
          content: `CodeCampus is a comprehensive platform designed to connect students with job opportunities, foster community engagement, and facilitate skill development. Whether you're a student looking for internships or a recruiter seeking talent, CodeCampus has you covered.`,
        },
        {
          title: "Creating Your Account",
          content: `Click the "Sign Up" button on the homepage. Fill in your basic information including name, email, and password. Verify your email address by clicking the link sent to your inbox. Set up your profile with a bio, skills, and profile picture.`,
        },
        {
          title: "Setting Up Your Profile",
          content: `Go to your profile settings and add a clear profile picture, write a compelling bio about yourself, list your technical and soft skills, add your education background, and include links to your portfolio or GitHub. A complete profile increases visibility to recruiters.`,
        },
        {
          title: "Exploring the Platform",
          content: `Browse through the different sections: Feed for community posts, Jobs for opportunities, Connections for networking, Messages for communication, and Recruiter Panel for hiring (if applicable).`,
        },
      ],
    },
    jobs: {
      title: "Jobs & Opportunities",
      icon: "💼",
      sections: [
        {
          title: "Browsing Job Listings",
          content: `Navigate to the Jobs section to see all available positions. Use filters to narrow down by company, location, job type, and required skills. Click on a job to view full details, requirements, and company information.`,
        },
        {
          title: "Applying for Jobs",
          content: `Click the "Apply" button on any job posting. Review the application details and submit. You'll receive a confirmation email, and recruiters will review your application. You can track application status in your profile.`,
        },
        {
          title: "Job Recommendations",
          content: `CodeCampus uses your profile information to suggest jobs that match your skills. Enable job alerts in Settings to get notified when positions matching your profile are posted.`,
        },
        {
          title: "Saving Jobs",
          content: `Click the bookmark icon on any job to save it for later. Access your saved jobs from your profile. Perfect for comparing opportunities before applying.`,
        },
      ],
    },
    connections: {
      title: "Connections & Networking",
      icon: "🤝",
      sections: [
        {
          title: "Finding People to Connect With",
          content: `Visit the Connections section to discover other students. Browse profiles and click "Connect" to send a connection request. View mutual connections to find common ground.`,
        },
        {
          title: "Managing Connections",
          content: `Accept or decline connection requests in your notifications. View your connection list and see recommended connections based on mutual interests and skills.`,
        },
        {
          title: "Networking Tips",
          content: `Write a personal message when sending connection requests. Engage with connections' posts by commenting and liking. Share your own experiences and insights to build your reputation.`,
        },
      ],
    },
    messaging: {
      title: "Messaging & Communication",
      icon: "💬",
      sections: [
        {
          title: "Starting a Conversation",
          content: `Click on a person's profile and select "Message" or go to Messages section and click "New Conversation". Search for the person you want to message or select from your connections.`,
        },
        {
          title: "Sending Messages",
          content: `Type your message and press Enter or click Send. You can send text, images, and file attachments. Messages are delivered instantly to connected users.`,
        },
        {
          title: "Sharing Files & Images",
          content: `Click the attachment icon to share files or images. Images display inline in the conversation. Files are downloadable by the recipient.`,
        },
        {
          title: "Message Management",
          content: `Delete your own messages by clicking the trash icon. Conversations are organized by most recent. Search through conversations using the search bar.`,
        },
      ],
    },
    feed: {
      title: "Community Feed",
      icon: "📰",
      sections: [
        {
          title: "Creating Posts",
          content: `Click "Create Post" in the Feed section. Add a title, description, optional code snippets, and tags. Share your learning experiences, ask questions, or showcase projects.`,
        },
        {
          title: "Interacting with Posts",
          content: `Like posts by clicking the heart icon. Comment to share your thoughts and engage in discussions. Share posts to your connections using the share button.`,
        },
        {
          title: "Content Guidelines",
          content: `Keep discussions respectful and on-topic. No spam, harassment, or self-promotion without context. Technical discussions and questions are encouraged.`,
        },
        {
          title: "Filtering Content",
          content: `Filter posts by college, skills, or tags. Follow specific tags to see relevant content. Mute users or topics you're not interested in.`,
        },
      ],
    },
    recruiter: {
      title: "Recruiter Tools",
      icon: "👔",
      sections: [
        {
          title: "Posting Jobs",
          content: `Access the Recruiter Panel from your dashboard. Click "Post New Job" and fill in job details including title, description, location, salary range, and required skills. Jobs are published immediately.`,
        },
        {
          title: "Managing Applications",
          content: `View all applications in your Recruiter Panel. Filter by status (New, Reviewing, Shortlisted, Rejected). Add notes and update application status to track progress.`,
        },
        {
          title: "Saving Candidates",
          content: `Save promising candidates for future opportunities. Create candidate lists and tag them with relevant skills and experience levels.`,
        },
        {
          title: "Scheduling Interviews",
          content: `Use the interview scheduling feature to set up meetings with candidates. Candidates receive notifications and can confirm availability.`,
        },
      ],
    },
    privacy: {
      title: "Privacy & Security",
      icon: "🔒",
      sections: [
        {
          title: "Data Protection",
          content: `CodeCampus uses industry-standard encryption (SSL/TLS) to protect your data. All personal information is encrypted both in transit and at rest. We comply with data protection regulations.`,
        },
        {
          title: "Privacy Controls",
          content: `Manage your privacy settings in Settings. Choose who can see your profile, contact you, or view your connections. You can make your profile private at any time.`,
        },
        {
          title: "Managing Your Data",
          content: `You can download your data at any time. Export your profile information, messages, and activity history. Permanently delete your account and all associated data.`,
        },
        {
          title: "Reporting Issues",
          content: `Found inappropriate content? Click the three dots menu and select "Report". Choose a reason and submit. Our team reviews reports within 24 hours.`,
        },
      ],
    },
    account: {
      title: "Account Management",
      icon: "⚙️",
      sections: [
        {
          title: "Changing Your Password",
          content: `Go to Settings and find "Security". Click "Change Password", enter your current password, then your new password twice. Password must be at least 8 characters with mixed case and numbers.`,
        },
        {
          title: "Two-Factor Authentication",
          content: `Enable 2FA in Settings for added security. Use an authenticator app or receive SMS codes. This prevents unauthorized access even if someone gets your password.`,
        },
        {
          title: "Email Management",
          content: `Update your email address in Settings. Verify the new email before the change takes effect. You'll need to log in again if you change your email.`,
        },
        {
          title: "Deleting Your Account",
          content: `Go to Settings and scroll to "Account" section. Click "Delete Account" and confirm deletion. This permanently removes your profile, all messages, and posted content. This action cannot be undone.`,
        },
      ],
    },
  };

  const categories = Object.entries(documentation).map(([key, value]) => ({
    id: key,
    title: value.title,
    icon: value.icon,
  }));

  const currentDocs = documentation[selectedCategory as keyof typeof documentation];

  const filteredSections = currentDocs.sections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: feedbackForm.name.trim(),
      email: feedbackForm.email.trim(),
      category: (feedbackForm.category || "general").trim().toLowerCase(),
      message: feedbackForm.message.trim(),
    };
    
    if (!payload.name || !payload.email || !payload.message) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
      });
      return;
    }

    if (payload.message.length < 10) {
      toast({
        title: "Error",
        description: "Message must be at least 10 characters",
      });
      return;
    }

    setSubmittingFeedback(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/feedback/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || "Failed to submit feedback");
      }

      toast({
        title: "Success!",
        description: "Thank you for your feedback. We appreciate your input!",
      });

      setFeedbackForm({
        name: "",
        email: "",
        category: "general",
        message: "",
      });
      setShowFeedbackForm(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit feedback. Please try again.",
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const docsContent = (
    <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <Book className="w-8 h-8 text-recruiter" />
            <h1 className="text-4xl font-bold">Documentation & Help</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Learn how to use CodeCampus and get the most out of our platform.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              className="pl-12 py-6 text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Categories */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-2"
          >
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedCategory === category.id
                    ? "bg-recruiter text-white"
                    : "hover:bg-secondary"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{category.icon}</span>
                  <span className="font-medium">{category.title}</span>
                </div>
              </button>
            ))}
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-3 space-y-4"
          >
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <span>{currentDocs.icon}</span>
              {currentDocs.title}
            </h2>

            {filteredSections.length > 0 ? (
              <div className="space-y-4">
                {filteredSections.map((section, idx) => (
                  <Card key={idx} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {section.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-secondary/30">
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No results found for "{searchTerm}". Try searching for
                    different terms.
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>

        {/* Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-8"
        >
          <Card>
            <CardHeader>
              <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
              <CardTitle className="text-base">Common Issues Solved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Most user issues are resolved using our documentation. Browse
                the guides above to find solutions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="w-6 h-6 text-blue-500 mb-2" />
              <CardTitle className="text-base">Still Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you can't find what you're looking for, submit your feedback
                or question below.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFeedbackForm(true)}
              >
                Submit Feedback <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <AlertCircle className="w-6 h-6 text-amber-500 mb-2" />
              <CardTitle className="text-base">Report a Bug</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Found a bug? Let us know through the feedback system and we'll
                investigate immediately.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFeedbackForm((prev) => ({
                    ...prev,
                    category: "bug",
                  }));
                  setShowFeedbackForm(true);
                }}
              >
                Report Bug <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Feedback Form Modal */}
        {showFeedbackForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowFeedbackForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border border-border rounded-xl shadow-xl max-w-2xl w-full"
            >
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Send className="w-6 h-6 text-recruiter" />
                    Send Feedback
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Your feedback helps us improve CodeCampus
                  </p>
                </div>

                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Name
                      </label>
                      <Input
                        placeholder="Your name"
                        value={feedbackForm.name}
                        onChange={(e) =>
                          setFeedbackForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email
                      </label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={feedbackForm.email}
                        onChange={(e) =>
                          setFeedbackForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Category
                    </label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background"
                      value={feedbackForm.category}
                      onChange={(e) =>
                        setFeedbackForm((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                    >
                      <option value="general">General Feedback</option>
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="support">Support Request</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Message
                    </label>
                    <textarea
                      placeholder="Tell us what you think..."
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background min-h-32 resize-vertical"
                      value={feedbackForm.message}
                      onChange={(e) =>
                        setFeedbackForm((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowFeedbackForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submittingFeedback}
                    >
                      {submittingFeedback ? "Sending..." : "Send Feedback"}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
    </div>
  );

  if (isAuthenticated) {
    return <DashboardLayout>{docsContent}</DashboardLayout>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 pt-24 pb-12">{docsContent}</main>
      <Footer />
    </div>
  );
};

export default Docs;
