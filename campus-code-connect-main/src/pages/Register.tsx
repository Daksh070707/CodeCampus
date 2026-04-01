import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, Building2, ArrowRight, GraduationCap, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import API from "@/lib/api";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { COLLEGES } from "@/lib/colleges";

type Role = "student" | "recruiter";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "" as Role,
    college: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRoleSelect = (role: Role) => {
    setFormData({ ...formData, role });
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Create user via Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = cred.user;

      // Send verification email
      await sendEmailVerification(user);

      // Sync profile to backend (service role) and store role
      try {
        const idToken = await user.getIdToken();
        localStorage.setItem("token", idToken);
        const resp = await API.post("/auth/firebase", {
          role: formData.role,
          college: formData.college,
          avatar_url: null,
        });
        const userInfo = resp.data?.user;
        if (userInfo) {
          localStorage.setItem("user", JSON.stringify(userInfo));
          if (userInfo.role) localStorage.setItem("role", userInfo.role);
        } else {
          localStorage.setItem("role", formData.role);
        }

        // Auto-join college community for students
        if (formData.role === "student" && formData.college) {
          try {
            await API.post("/auth/join-college-community", { college: formData.college });
            console.log("Successfully joined college community during registration");
          } catch (joinError) {
            console.warn("Failed to join college community:", joinError.message);
            // Don't fail the registration if community join fails
          }
        }
      } catch (err) {
        console.warn('Failed to sync profile after Firebase sign-up', err);
        localStorage.setItem("role", formData.role);
      }

      await signOut(auth);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");

      toast({ title: 'Account created!', description: 'Verification email sent. Please verify your email before logging in.' });
      navigate("/login");
    } catch (error: any) {
      console.error('Register error:', error);
      const message = error?.message || error?.error || error?.response?.data?.message || JSON.stringify(error);

      toast({
        title: 'Registration failed',
        description: message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4 py-12">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/CODE.png" alt="CodeCampus" className="w-10 h-10 rounded-xl object-cover" />
          <span className="text-2xl font-bold">CodeCampus</span>
        </Link>

        <GlassCard className="p-8">
          {step === 1 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Join CodeCampus</h1>
                <p className="text-muted-foreground">Choose how you want to use the platform</p>
              </div>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("student")}
                  className="w-full p-6 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-student/50 transition-all duration-300 text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-student/20 flex items-center justify-center group-hover:bg-student/30 transition-colors">
                      <GraduationCap className="w-6 h-6 text-student" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">I'm a Student</h3>
                      <p className="text-sm text-muted-foreground">
                        Share projects, connect with peers, and find internships
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect("recruiter")}
                  className="w-full p-6 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-recruiter/50 transition-all duration-300 text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-recruiter/20 flex items-center justify-center group-hover:bg-recruiter/30 transition-colors">
                      <Briefcase className="w-6 h-6 text-recruiter" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">I'm a Recruiter</h3>
                      <p className="text-sm text-muted-foreground">
                        Post jobs, find talent, and connect with top colleges
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ← Back
                </button>
              </div>

              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Create Your Account</h1>
                <p className="text-muted-foreground">
                  Signing up as a{" "}
                  <span className={formData.role === "student" ? "text-student" : "text-recruiter"}>
                    {formData.role === "student" ? "Student" : "Recruiter"}
                  </span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="college">{formData.role === "student" ? "College / University" : "Company"}</Label>
                  {formData.role === "student" ? (
                    <Select value={formData.college} onValueChange={(value) => setFormData({ ...formData, college: value })}>
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
                  ) : (
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="college"
                        type="text"
                        placeholder="Tech Corp Inc."
                        className="pl-10"
                        value={formData.college}
                        onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  variant={formData.role === "student" ? "student" : "recruiter"}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Create Account
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-xs text-center text-muted-foreground">
                By creating an account, you agree to our{" "}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Register;
