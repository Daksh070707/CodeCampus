import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Briefcase, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import API from "@/lib/api"; // legacy API helper
import { signInWithGoogle, auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginRole, setLoginRole] = useState<"student" | "recruiter">("student");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  // ✅ REAL LOGIN LOGIC
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use Firebase email/password auth
      const cred = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = cred.user;
      // Get Firebase ID token
      const idToken = await user.getIdToken();
      // Temporarily store Firebase token so API call can attach it
      localStorage.setItem("token", idToken);

      // Sync Firebase user to backend profile (service role)
      try {
        const resp = await API.post("/auth/firebase", { role: loginRole });
        const userInfo = resp.data?.user;
        if (userInfo) localStorage.setItem("user", JSON.stringify(userInfo));
        if (userInfo?.role) localStorage.setItem("role", userInfo.role);
      } catch (err) {
        console.warn("Failed to exchange Firebase token with backend", err);
      }

      if (!localStorage.getItem("role")) {
        localStorage.setItem("role", loginRole);
      }

      toast({ title: "Welcome back!", description: "Login successful. Redirecting..." });
      navigate(loginRole === "recruiter" ? "/recruiter" : "/dashboard/feed");
    } catch (error: any) {
      console.error('Login error:', error);
      const errMsg = error?.message || error?.error || error?.response?.data?.message || "Invalid email or password";
      toast({
        title: "Login failed",
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const res = await signInWithGoogle();
      const user = res.user;

      // Get Firebase ID token and sync backend profile
      const idToken = await user.getIdToken();
      localStorage.setItem("token", idToken);
      try {
        const resp = await API.post("/auth/firebase", { role: loginRole });
        const userInfo = resp.data?.user;
        if (userInfo) localStorage.setItem("user", JSON.stringify(userInfo));
        if (userInfo?.role) localStorage.setItem("role", userInfo.role);
      } catch (err) {
        // fallback to storing basic user info
        localStorage.setItem("user", JSON.stringify({ uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL }));
        console.warn("Failed to exchange Firebase token with backend", err);
      }

      if (!localStorage.getItem("role")) {
        localStorage.setItem("role", loginRole);
      }

      toast({ title: "Signed in", description: `Welcome ${user.displayName}` });
      navigate(loginRole === "recruiter" ? "/recruiter" : "/dashboard/feed");
    } catch (error: any) {
      toast({ title: "Authentication failed", description: error.message || "Google sign-in failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

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
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setLoginRole("student")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                loginRole === "student"
                  ? "border-student/50 bg-student/10 text-student"
                  : "border-border text-muted-foreground hover:bg-secondary/40"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student
            </button>
            <button
              type="button"
              onClick={() => setLoginRole("recruiter")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                loginRole === "recruiter"
                  ? "border-recruiter/50 bg-recruiter/10 text-recruiter"
                  : "border-border text-muted-foreground hover:bg-secondary/40"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Recruiter
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-4">
            <Button variant="outline" className="w-full mb-2" onClick={handleGoogleSignIn} disabled={isLoading}>
              Sign in as {loginRole === "recruiter" ? "Recruiter" : "Student"} with Google
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};
  
export default Login;
