import { useState, useEffect } from "react";
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
  Loader2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import API from "@/lib/api";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  posted?: string;
  deadline?: string;
  match?: number;
  skills: string[];
  description: string;
  created_at: string;
  status: string;
  recruiter?: {
    id: string;
    name: string;
    company: string;
    avatar_url?: string;
  };
}

const Jobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    location: "",
    company: "",
  });
  const { toast } = useToast();

  // Fetch jobs from API
  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchQuery) params.append("search", searchQuery);
      if (filters.type) params.append("type", filters.type);
      if (filters.location) params.append("location", filters.location);
      if (filters.company) params.append("company", filters.company);

      const response = await API.get(`/jobs?${params.toString()}`);
      setJobs(response.data.jobs || []);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to fetch jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch saved jobs
  const fetchSavedJobs = async () => {
    try {
      const response = await API.get("/jobs/saved");
      const savedJobs = response.data.jobs || [];
      const savedIds = new Set(savedJobs.map((job: Job) => job.id));
      setSavedJobIds(savedIds);
      
      if (showSavedOnly) {
        setJobs(savedJobs);
      }
    } catch (error: any) {
      console.error("Error fetching saved jobs:", error);
      // Don't show error toast for saved jobs as it's not critical
    }
  };

  // Toggle save job
  const toggleSaveJob = async (jobId: string) => {
    try {
      const isSaved = savedJobIds.has(jobId);
      
      if (isSaved) {
        await API.delete(`/jobs/${jobId}/save`);
        setSavedJobIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
        toast({
          title: "Job unsaved",
          description: "Job removed from your saved list.",
        });
        
        // If showing saved only, remove from list
        if (showSavedOnly) {
          setJobs(prev => prev.filter(job => job.id !== jobId));
        }
      } else {
        await API.post(`/jobs/${jobId}/save`);
        setSavedJobIds(prev => new Set(prev).add(jobId));
        toast({
          title: "Job saved",
          description: "Job added to your saved list.",
        });
      }
    } catch (error: any) {
      console.error("Error toggling save job:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save job. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Apply to job
  const applyToJob = async (jobId: string, jobTitle: string) => {
    try {
      await API.post(`/jobs/${jobId}/apply`);
      toast({
        title: "Application submitted",
        description: `Your application for ${jobTitle} has been submitted successfully.`,
      });
    } catch (error: any) {
      console.error("Error applying to job:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to apply. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Load jobs on mount and when filters change
  useEffect(() => {
    if (showSavedOnly) {
      fetchSavedJobs();
    } else {
      fetchJobs();
      fetchSavedJobs(); // Also fetch saved job IDs for marking
    }
  }, [showSavedOnly]);

  // Fetch jobs when search or filters change
  useEffect(() => {
    if (!showSavedOnly) {
      const delayDebounceFn = setTimeout(() => {
        fetchJobs();
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, filters]);

  // Clear filters
  const clearFilters = () => {
    setFilters({ type: "", location: "", company: "" });
    setSearchQuery("");
  };

  const hasActiveFilters = searchQuery || filters.type || filters.location || filters.company;

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
            <Button 
              variant={showSavedOnly ? "default" : "outline"}
              onClick={() => setShowSavedOnly(!showSavedOnly)}
            >
              <Bookmark className={`w-4 h-4 mr-2 ${showSavedOnly ? "fill-current" : ""}`} />
              Saved Jobs
            </Button>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, companies, or skills..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={showSavedOnly}
              />
            </div>
            <Button 
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              disabled={showSavedOnly}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && !showSavedOnly && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Job Type</Label>
                    <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All types</SelectItem>
                        <SelectItem value="Full-time">Full-time</SelectItem>
                        <SelectItem value="Internship">Internship</SelectItem>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Remote, San Francisco"
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="e.g., Google, Microsoft"
                      value={filters.company}
                      onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
                    />
                  </div>
                </div>
                
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-2" />
                      Clear filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!loading && jobs.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {showSavedOnly ? "No saved jobs yet" : "No jobs found"}
              </h3>
              <p className="text-muted-foreground">
                {showSavedOnly 
                  ? "Start saving jobs you're interested in to view them here."
                  : "Try adjusting your search or filters to find more opportunities."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Job Listings */}
        {!loading && jobs.length > 0 && (
          <div className="grid gap-4">
            {jobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {/* Company Logo */}
                        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                          {job.recruiter?.avatar_url ? (
                            <img 
                              src={job.recruiter.avatar_url} 
                              alt={job.company} 
                              className="w-full h-full rounded-xl object-cover"
                            />
                          ) : (
                            <Building2 className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold">{job.title}</h3>
                            {job.match && (
                              <Badge variant="student" className="text-xs">
                                <Sparkles className="w-3 h-3 mr-1" />
                                {job.match}% match
                              </Badge>
                            )}
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
                            {job.salary && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {job.salary}
                              </span>
                            )}
                          </div>

                          <p className="text-muted-foreground text-sm line-clamp-2">{job.description}</p>

                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {job.skills?.map((skill) => (
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
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => toggleSaveJob(job.id)}
                            className={savedJobIds.has(job.id) ? "text-primary" : ""}
                          >
                            <Bookmark className={`w-4 h-4 ${savedJobIds.has(job.id) ? "fill-current" : ""}`} />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDate(job.created_at)}
                        </div>
                        
                        <Button 
                          size="sm" 
                          className="mt-auto"
                          onClick={() => applyToJob(job.id, job.title)}
                        >
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
        )}
      </div>
    </DashboardLayout>
  );
};

export default Jobs;
