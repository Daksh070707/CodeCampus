import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Mail, Save, ShieldCheck, User, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import API from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { COLLEGES } from "@/lib/colleges";

const Profile = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [college, setCollege] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = localStorage.getItem("user");
        const fallbackEmail = stored ? JSON.parse(stored)?.email : "";
        
        console.log("Loading profile...");
        const res = await API.get("/auth/profile");
        console.log("Profile load response:", res.data);
        
        const existing = res.data?.profile;
        if (existing) {
          console.log("Profile loaded:", existing.id);
          setProfileId(existing.id);
          setName(existing.name || "");
          setEmail(existing.email || fallbackEmail || "");
          setRole(existing.role || "student");
          setCollege(existing.college || "");
          setAvatarUrl(existing.avatar_url || "");
        } else {
          console.warn("No profile in response");
          setEmail(fallbackEmail || "");
        }
      } catch (error: any) {
        console.error("Profile load error:", error);
        const errorMsg = error?.response?.data?.message || error?.message || "Failed to load profile";
        toast({ title: "Profile load failed", description: errorMsg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: name || null,
        college: college || null,
        avatar_url: avatarUrl || null,
      };

      console.log("Saving profile with payload:", payload);
      const res = await API.put("/auth/profile", payload);
      console.log("Profile save response:", res.data);
      
      const saved = res.data?.profile;
      if (saved?.id) setProfileId(saved.id);
      
      // Auto-join college community if college is selected
      if (college && college.trim()) {
        try {
          await API.post("/auth/join-college-community", { college });
          console.log("Successfully joined college community:", college);
        } catch (communityError) {
          console.warn("Failed to join college community:", communityError);
          // Don't fail the entire save if community join fails
        }
      }
      
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (error: any) {
      console.error("Profile save error:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Unable to update profile";
      toast({ title: "Save failed", description: errorMsg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be smaller than 10MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Read the file
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            // Create canvas and compress
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Limit dimensions to max 800x800
            const maxDim = 800;
            if (width > height) {
              if (width > maxDim) {
                height = Math.round(height * (maxDim / width));
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round(width * (maxDim / height));
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Convert to base64 with reduced quality (0.8 = 80%)
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
              setAvatarUrl(compressedBase64);
              toast({ title: "Photo updated", description: "Remember to click 'Save Changes' to confirm" });
            }
          } catch (compressErr) {
            console.error("Image compression error:", compressErr);
            // Fallback: use original base64
            const base64 = event.target?.result as string;
            setAvatarUrl(base64);
            toast({ title: "Photo updated", description: "Remember to click 'Save Changes' to confirm" });
          }
        };
        img.onerror = () => {
          toast({ title: "Error", description: "Failed to process image", variant: "destructive" });
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        toast({ title: "Error", description: "Failed to read file", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ title: "Error", description: "Failed to process image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-semibold">Profile</h1>
            <p className="text-muted-foreground">Manage your personal details and public profile.</p>
          </div>
          <Button variant="recruiter" onClick={handleSave} disabled={saving || loading}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>

        <div className="grid md:grid-cols-[280px_1fr] gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>{name ? name.split(" ").map((n) => n[0]).join("") : "ME"}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <div className="font-medium">{name || "Your Name"}</div>
                <div className="text-xs text-muted-foreground">{role}</div>
              </div>
              <Input
                placeholder="Avatar URL (or use photo upload)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
              <Button 
                variant="outline" 
                className="w-full"
                onClick={triggerFileInput}
                disabled={uploading}
              >
                <Camera className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Photo"}
              </Button>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                  // Reset input so same file can be selected again
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="hidden"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Personal Details</CardTitle>
              <Badge variant="outline" className="text-xs">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Input value={role} readOnly disabled className="bg-secondary/40" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">College / University</label>
                  <Select value={college} onValueChange={setCollege}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your college..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {COLLEGES.map((collegeName) => (
                        <SelectItem key={collegeName} value={collegeName}>
                          {collegeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                Updates will sync to your public profile.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
