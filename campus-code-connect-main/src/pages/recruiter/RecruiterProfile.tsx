import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Globe, Mail, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RecruiterLayout from "@/components/layout/RecruiterLayout";
import { useToast } from "@/hooks/use-toast";

const STORAGE_KEY = "recruiterProfile";

const RecruiterProfile = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("Acme Talent");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [companySize, setCompanySize] = useState("201-500");
  const [hqLocation, setHqLocation] = useState("San Francisco, CA");
  const [contactEmail, setContactEmail] = useState("talent@acme.com");
  const [careersEmail, setCareersEmail] = useState("careers@acme.com");
  const [about, setAbout] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      setCompanyName(parsed.companyName || companyName);
      setWebsite(parsed.website || website);
      setIndustry(parsed.industry || industry);
      setCompanySize(parsed.companySize || companySize);
      setHqLocation(parsed.hqLocation || hqLocation);
      setContactEmail(parsed.contactEmail || contactEmail);
      setCareersEmail(parsed.careersEmail || careersEmail);
      setAbout(parsed.about || about);
    } catch (error) {
      // ignore malformed storage
    }
  }, []);

  const handleSave = () => {
    setSaving(true);
    const payload = {
      companyName,
      website,
      industry,
      companySize,
      hqLocation,
      contactEmail,
      careersEmail,
      about,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Company profile saved", description: "Recruiter branding updated." });
    }, 350);
  };

  return (
    <RecruiterLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-semibold">Company Profile</h1>
            <p className="text-muted-foreground">Shape how candidates see your employer brand.</p>
          </div>
          <Button variant="recruiter" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </motion.div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Building2 className="w-5 h-5 text-recruiter" />
              <CardTitle>Company details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Company name</label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Industry</label>
                  <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company size</label>
                  <Input value={companySize} onChange={(e) => setCompanySize(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Headquarters</label>
                <Input value={hqLocation} onChange={(e) => setHqLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">About</label>
                <Textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Describe your mission, culture, and values."
                  className="min-h-[140px]"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <Globe className="w-5 h-5 text-recruiter" />
                <CardTitle>Brand links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website</label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact email</label>
                  <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Careers inbox</label>
                  <Input value={careersEmail} onChange={(e) => setCareersEmail(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center gap-3">
                <Mail className="w-5 h-5 text-recruiter" />
                <CardTitle>Hiring preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>Recommended response time: 48 hours.</div>
                <div>Default pipeline: Screen, Interview, Offer, Hire.</div>
                <div>Brand assets can be uploaded in the next release.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterProfile;
