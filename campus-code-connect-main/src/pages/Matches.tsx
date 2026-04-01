import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Building2, MapPin, Clock, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/profile";
import API from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const stopwords = new Set([
  "the","a","an","and","or","to","of","in","on","for","with","is","are","it","this","that","as","by","from","we","you","i",
]);

function extractKeywordsFromText(text = ""){
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));
}

// Format date helper
function formatDate(dateString: string | undefined) {
  if (!dateString) return "Recently posted";
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

const Matches = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [applyingJobIds, setApplyingJobIds] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  const applyToJob = async (jobId: string, jobTitle: string) => {
    if (applyingJobIds.has(jobId) || appliedJobIds.has(jobId)) return;

    setApplyingJobIds((prev) => new Set(prev).add(jobId));
    try {
      await API.post(`/jobs/${jobId}/apply`);
      setAppliedJobIds((prev) => new Set(prev).add(jobId));
      toast({
        title: "Application submitted",
        description: `Your application for ${jobTitle} has been submitted successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to apply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApplyingJobIds((prev) => {
        const updated = new Set(prev);
        updated.delete(jobId);
        return updated;
      });
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // First, fetch all jobs from API
      let allJobs: any[] = [];
      try {
        const response = await API.get('/jobs');
        allJobs = response.data.jobs || [];
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setLoading(false);
        return;
      }

      const stored = localStorage.getItem("user");
      if (!stored) {
        // fallback: show default jobs sorted by their built-in match
        setJobs(allJobs.sort((a,b) => (b.match||0) - (a.match||0)));
        setLoading(false);
        return;
      }

      const user = JSON.parse(stored);
      const id = user.id || user.uid || (user.user && user.user.id);

      try {
        const p = await getProfile(id);
        setProfile(p);
      } catch (e) {
        // ignore
      }

      // fetch user's posts to derive keywords, tags and engagement
      let userPosts: any[] = [];
      try {
        const { data } = await supabase.from("posts").select("*").eq("user_id", id);
        userPosts = data || [];
      } catch (e) {
        userPosts = [];
      }

      // derive keywords / tags
      const keywordCounts: Record<string, number> = {};
      userPosts.forEach(p => {
        // tags array
        if (Array.isArray(p.tags)) {
          p.tags.forEach((t: string) => {
            const k = t.toLowerCase();
            keywordCounts[k] = (keywordCounts[k] || 0) + 3; // tags weigh more
          });
        }
        // content
        const ks = extractKeywordsFromText(p.content || "");
        ks.forEach(k => keywordCounts[k] = (keywordCounts[k]||0) + 1);
        // title
        const ts = extractKeywordsFromText(p.title || "");
        ts.forEach(k => keywordCounts[k] = (keywordCounts[k]||0) + 2);
        // engagement weight from likes/comments if present
        const engagement = (p.likes || 0) + (p.comments || 0);
        if (engagement > 0) {
          // boost the keywords found in this post by engagement/10
          ks.forEach(k => keywordCounts[k] = (keywordCounts[k]||0) + Math.round(engagement/10));
        }
      });

      const keywords = Object.keys(keywordCounts);

      // simple scoring: overlap between job.skills and keywords/tags
      const scored = allJobs.map(job => {
        const jobSkills = (job.skills || []).map((s:string) => s.toLowerCase());
        let score = job.match || 0; // base from job data
        // add points for skill overlap
        let overlap = 0;
        jobSkills.forEach(skill => {
          if (keywords.includes(skill)) overlap += (keywordCounts[skill] || 1);
        });
        // partial match by checking skill substrings in keywords
        jobSkills.forEach(skill => {
          keywords.forEach(k => {
            if (k.includes(skill) || skill.includes(k)) {
              overlap += (keywordCounts[k] || 0) * 0.5;
            }
          });
        });

        score += Math.min(100 - score, Math.round(overlap * 5));
        return { ...job, aiScore: Math.round(score) };
      });

      scored.sort((a,b) => (b.aiScore || 0) - (a.aiScore || 0));
      setJobs(scored);

      setLoading(false);
    };

    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl font-bold">AI Matches</h1>
              <p className="text-muted-foreground">Jobs matched to your posts, likes and activity</p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Calculating matches…</div>
          ) : jobs.length === 0 ? (
            <div className="text-sm text-muted-foreground">No matches found yet.</div>
          ) : (
            jobs.map((job, idx) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.03 }}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-muted-foreground" />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold">{job.title}</h3>
                            <Badge variant="student" className="text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              {job.aiScore}% match
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
                              <Clock className="w-4 h-4" />
                              {formatDate(job.created_at || job.posted)}
                            </span>
                          </div>

                          <p className="text-muted-foreground text-sm line-clamp-2">{job.description}</p>

                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {(job.skills || []).map((s:string) => (
                              <Badge key={s} variant="skill" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex lg:flex-col items-center lg:items-end gap-3 lg:gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={job.type === "Internship" ? "recruiter" : "outline"} className="text-xs">{job.type}</Badge>
                        </div>
                        <Button
                          size="sm"
                          className="mt-auto"
                          disabled={applyingJobIds.has(job.id) || appliedJobIds.has(job.id)}
                          onClick={() => applyToJob(job.id, job.title)}
                        >
                          {appliedJobIds.has(job.id)
                            ? "Applied"
                            : applyingJobIds.has(job.id)
                            ? "Applying..."
                            : "Apply Now"}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Matches;
