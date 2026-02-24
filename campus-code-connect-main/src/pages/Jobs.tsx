import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  MapPin, 
  Clock, 
  Building2,
  Bookmark,
  ExternalLink,
  Briefcase,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/layout/DashboardLayout";

export const jobs = [
  {
    id: 1,
    title: "Software Engineering Intern",
    company: "Microsoft",
    logo: "",
    location: "Seattle, WA / Remote",
    type: "Internship",
    salary: "$45-55/hr",
    posted: "2 days ago",
    deadline: "Dec 15, 2024",
    match: 95,
    skills: ["React", "TypeScript", "Node.js", "Azure"],
    description: "Join our team to build the next generation of cloud services. You'll work on real products used by millions of users worldwide.",
    saved: true,
  },
  {
    id: 2,
    title: "Frontend Developer",
    company: "Stripe",
    logo: "",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$150-180k",
    posted: "3 days ago",
    deadline: "Jan 5, 2025",
    match: 88,
    skills: ["React", "TypeScript", "GraphQL", "Tailwind"],
    description: "Help us build beautiful, accessible, and performant financial infrastructure used by millions of businesses.",
    saved: false,
  },
  {
    id: 3,
    title: "Full Stack Developer",
    company: "Notion",
    logo: "",
    location: "New York, NY / Remote",
    type: "Full-time",
    salary: "$140-170k",
    posted: "1 week ago",
    deadline: "Dec 30, 2024",
    match: 82,
    skills: ["React", "Node.js", "PostgreSQL", "AWS"],
    description: "Join Notion's engineering team to build tools that millions of people use to organize their work and life.",
    saved: false,
  },
  {
    id: 4,
    title: "Machine Learning Intern",
    company: "OpenAI",
    logo: "",
    location: "San Francisco, CA",
    type: "Internship",
    salary: "$60-70/hr",
    posted: "5 days ago",
    deadline: "Jan 15, 2025",
    match: 76,
    skills: ["Python", "PyTorch", "TensorFlow", "ML"],
    description: "Work on cutting-edge AI research and help shape the future of artificial intelligence.",
    saved: true,
  },
];

const Jobs = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-2xl font-bold">Job Board</h1>
            <p className="text-muted-foreground">Discover opportunities matched to your skills</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Bookmark className="w-4 h-4 mr-2" />
              Saved Jobs
            </Button>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs, companies, or skills..."
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </motion.div>

        {/* Job Listings */}
        <div className="grid gap-4">
          {jobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Company Logo */}
                      <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-muted-foreground" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold">{job.title}</h3>
                          <Badge variant="student" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {job.match}% match
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {job.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {job.salary}
                          </span>
                        </div>

                        <p className="text-muted-foreground text-sm line-clamp-2">{job.description}</p>

                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {job.skills.map((skill) => (
                            <Badge key={skill} variant="skill" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex lg:flex-col items-center lg:items-end gap-3 lg:gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={job.type === "Internship" ? "recruiter" : "outline"} className="text-xs">
                          {job.type}
                        </Badge>
                        <Button variant="ghost" size="icon" className={job.saved ? "text-primary" : ""}>
                          <Bookmark className={`w-4 h-4 ${job.saved ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {job.posted}
                      </div>
                      
                      <Button size="sm" className="mt-auto">
                        Apply Now
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
  
};



export default Jobs;
