import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast({
        title: "Reset link sent",
        description: "If this email exists, a password reset link has been sent.",
      });
    } catch (error: any) {
      const code = error?.code || "";

      if (code === "auth/user-not-found") {
        toast({
          title: "Reset link sent",
          description: "If this email exists, a password reset link has been sent.",
        });
      } else {
        toast({
          title: "Could not send reset link",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/CODE.png" alt="CodeCampus" className="w-10 h-10 rounded-xl object-cover" />
          <span className="text-2xl font-bold">CodeCampus</span>
        </Link>

        <GlassCard className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
            <p className="text-muted-foreground">Enter your email to receive a reset link.</p>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
