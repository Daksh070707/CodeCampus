import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  Code2, 
  ArrowRight,
  Sparkles,
  MessageSquare,
  Eye,
  Heart,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, GlassCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Link } from "react-router-dom";

const statsCards = [
  {
    title: "Profile Views",
    value: "1,284",
    change: "+12%",
    icon: Eye,
    color: "text-primary",
  },
  {
    title: "Connections",
    value: "342",
    change: "+8%",
    icon: Users,
    color: "text-student",
  },
  {
    title: "Job Matches",
    value: "28",
    change: "+15%",
    icon: Briefcase,
    color: "text-recruiter",
  },
  {
    title: "Posts",
    value: "56",
    change: "+5%",
    icon: Code2,
    color: "text-accent",
  },
];

const recentPosts = [
  {
    id: 1,
    author: "Sarah Chen",
    avatar: "",
    role: "CS Student @ MIT",
    title: "Built a real-time collaborative code editor with WebSockets",
    tags: ["React", "WebSocket", "TypeScript"],
    likes: 124,
    comments: 32,
    time: "2h ago",
  },
  {
    id: 2,
    author: "Mike Johnson",
    avatar: "",
    role: "Software Engineer @ Google",
    title: "Tips for acing your technical interview",
    tags: ["Career", "Interview", "Tips"],
    likes: 89,
    comments: 18,
    time: "4h ago",
  },
  {
    id: 3,
    author: "Emily Davis",
    avatar: "",
    role: "Data Science @ Stanford",
    title: "Machine Learning project: Predicting stock prices",
    tags: ["Python", "ML", "Finance"],
    likes: 156,
    comments: 45,
    time: "6h ago",
  },
];

const recommendedJobs = [
  {
    id: 1,
    title: "Software Engineering Intern",
    company: "Microsoft",
    location: "Remote",
    type: "Internship",
    match: 95,
  },
  {
    id: 2,
    title: "Frontend Developer",
    company: "Stripe",
    location: "San Francisco, CA",
    type: "Full-time",
    match: 88,
  },
  {
    id: 3,
    title: "Full Stack Developer",
    company: "Notion",
    location: "New York, NY",
    type: "Full-time",
    match: 82,
  },
];

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-1">Welcome back, John! 👋</h1>
              <p className="text-muted-foreground">Here's what's happening in your community today.</p>
            </div>
            <Button variant="hero" asChild>
              <Link to="/dashboard/feed">
                <Code2 className="w-4 h-4 mr-2" />
                Create Post
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {statsCards.map((stat, index) => (
            <GlassCard key={index} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                <Badge variant="success" className="text-xs">
                  {stat.change}
                </Badge>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.title}</div>
            </GlassCard>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Posts */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Feed</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard/feed">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.avatar} />
                        <AvatarFallback>{post.author.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{post.author}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{post.role}</span>
                        </div>
                        <h4 className="font-medium mb-2 line-clamp-1">{post.title}</h4>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {post.tags.map((tag) => (
                            <Badge key={tag} variant="skill" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            {post.comments}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {post.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Recommended Jobs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Matches
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard/jobs">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {recommendedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{job.title}</h4>
                        <p className="text-sm text-muted-foreground">{job.company}</p>
                      </div>
                      <Badge variant="student" className="text-xs">
                        {job.match}% match
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{job.location}</span>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        {job.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
