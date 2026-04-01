import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardList,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

interface RecruiterLayoutProps {
  children: React.ReactNode;
}

const recruiterNav = [
  { icon: BarChart3, label: "Overview", href: "/recruiter" },
  { icon: Building2, label: "Company Profile", href: "/recruiter/profile" },
  { icon: Briefcase, label: "Jobs", href: "/recruiter/jobs" },
  { icon: ClipboardList, label: "Pipeline", href: "/recruiter/applicants" },
  { icon: Search, label: "Candidates", href: "/recruiter/candidates" },
  { icon: MessageSquare, label: "Messages", href: "/recruiter/messages" },
  { icon: Users, label: "Connections", href: "/recruiter/connections" },
  { icon: Trophy, label: "Coding Games", href: "/recruiter/coding-games" },
  { icon: Calendar, label: "Interviews", href: "/recruiter/interviews" },
  { icon: Settings, label: "Settings", href: "/recruiter/settings" },
];

const RecruiterLayout = ({ children }: RecruiterLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companyName, setCompanyName] = useState("Acme Talent");
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (href: string) => location.pathname === href;

  useEffect(() => {
    const stored = localStorage.getItem("recruiterProfile");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.companyName) setCompanyName(parsed.companyName);
    } catch (error) {
      // ignore storage errors
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      // ignore sign-out errors
    }
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
            <Link to="/recruiter" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-recruiter/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-recruiter" />
              </div>
              <div>
                <div className="text-sm font-semibold text-sidebar-foreground">Talent Hub</div>
                    <div className="text-xs text-muted-foreground">Recruiter Console</div>
              </div>
            </Link>
            <button
              className="lg:hidden p-2 hover:bg-sidebar-accent rounded-lg"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-sidebar-foreground" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {recruiterNav.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-recruiter text-recruiter-foreground">HR</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-sidebar-foreground">Hiring Team</div>
                    <div className="text-xs text-muted-foreground">{companyName}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/recruiter/profile" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Company Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/recruiter/settings?tab=team" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team Management
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/recruiter/settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Workspace Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2 text-destructive" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <div className="text-sm text-muted-foreground">Recruiter</div>
              <div className="font-semibold">{companyName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge variant="recruiter" className="text-xs">Pro Hiring</Badge>
            <Button variant="recruiter" size="sm" asChild>
              <Link to="/recruiter/jobs">Create Job</Link>
            </Button>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default RecruiterLayout;
