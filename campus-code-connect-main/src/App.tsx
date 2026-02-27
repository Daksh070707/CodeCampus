import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Feed from "./pages/Feed";
import Community from "./pages/Community";
import Analytics from "./pages/Analytics";
import Jobs from "./pages/Jobs";
import Matches from "./pages/Matches";
import Messages from "./pages/Messages";
import Connections from "./pages/Connections";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Saved from "./pages/Saved";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import RecruiterRoute from "@/components/RecruiterRoute";
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import RecruiterJobs from "./pages/recruiter/RecruiterJobs";
import RecruiterApplicants from "./pages/recruiter/RecruiterApplicants";
import RecruiterCandidates from "./pages/recruiter/RecruiterCandidates";
import RecruiterMessages from "./pages/recruiter/RecruiterMessages";
import RecruiterProfile from "./pages/recruiter/RecruiterProfile";
import RecruiterInterviews from "./pages/recruiter/RecruiterInterviews";
import RecruiterSettings from "./pages/recruiter/RecruiterSettings";
import RecruiterConnections from "./pages/recruiter/RecruiterConnections";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          <Route path="/dashboard/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/dashboard/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
          <Route path="/dashboard/saved" element={<ProtectedRoute><Saved /></ProtectedRoute>} />
          <Route path="/dashboard/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/dashboard/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
          <Route path="/dashboard/matches" element={<ProtectedRoute><Matches /></ProtectedRoute>} />
          <Route path="/dashboard/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/dashboard/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
          <Route path="/dashboard/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          <Route path="/recruiter" element={<RecruiterRoute><RecruiterDashboard /></RecruiterRoute>} />
          <Route path="/recruiter/profile" element={<RecruiterRoute><RecruiterProfile /></RecruiterRoute>} />
          <Route path="/recruiter/jobs" element={<RecruiterRoute><RecruiterJobs /></RecruiterRoute>} />
          <Route path="/recruiter/applicants" element={<RecruiterRoute><RecruiterApplicants /></RecruiterRoute>} />
          <Route path="/recruiter/candidates" element={<RecruiterRoute><RecruiterCandidates /></RecruiterRoute>} />
          <Route path="/recruiter/messages" element={<RecruiterRoute><RecruiterMessages /></RecruiterRoute>} />
          <Route path="/recruiter/connections" element={<RecruiterRoute><RecruiterConnections /></RecruiterRoute>} />
          <Route path="/recruiter/interviews" element={<RecruiterRoute><RecruiterInterviews /></RecruiterRoute>} />
          <Route path="/recruiter/settings" element={<RecruiterRoute><RecruiterSettings /></RecruiterRoute>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
