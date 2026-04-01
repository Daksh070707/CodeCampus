import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  MessageSquare,
  Briefcase,
  Users,
  Settings,
  Bookmark,
  
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Sparkles,
  FileCode,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ThemeToggle from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProfile } from "@/lib/profile";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: FileCode, label: "Feed", href: "/dashboard/feed" },
  { icon: Bookmark, label: "Saved", href: "/dashboard/saved" },
  { icon: MessageSquare, label: "Messages", href: "/dashboard/messages", badge: 3 },
  { icon: Briefcase, label: "Jobs", href: "/dashboard/jobs" },
  { icon: Sparkles, label: "AI Matches", href: "/dashboard/matches" },
  { icon: Users, label: "Community", href: "/dashboard/community" },
  { icon: Users, label: "Connections", href: "/dashboard/connections" },
  { icon: Trophy, label: "Coding Games", href: "/dashboard/coding-games" },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const [profile, setProfile] = useState<any>(() => {
    // Initialize from localStorage cache on mount
    const cached = localStorage.getItem("profileCache");
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(!profile);
  const location = useLocation();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = localStorage.getItem("user");
        if (!stored) {
          setLoading(false);
          return;
        }
        const user = JSON.parse(stored);
        const id = user.id || user.uid || (user.user && user.user.id);
        if (id) {
          const p = await getProfile(id);
          setProfile(p);
          // Cache profile data
          localStorage.setItem("profileCache", JSON.stringify(p));
        }
      } catch (e) {
        console.warn("Failed to load profile in layout:", e);
      } finally {
        setLoading(false);
      }
    };

    // Only load if not already cached
    if (!profile) {
      loadProfile();
    }
  }, []); // Only run once on mount

  const isActive = (href: string) => location.pathname === href;

  const userInitials = profile?.name
    ? profile.name.split(" ").map((n: string) => n[0]).join("")
    : "ME";

  const userName = profile?.name || "User";
  const userRole = profile?.role || "Student";

  useEffect(() => {
    if (sidebarOpen && navRef.current) {
      navRef.current.scrollTop = 0;
    }
  }, [sidebarOpen]);

  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Mobile Overlay */}
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

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-full sm:w-80 lg:w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 lg:h-screen ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-screen overflow-hidden">
          {/* Logo */}
          <div className="h-16 flex-shrink-0 flex items-center justify-between px-4 border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/CODE.png" alt="CodeCampus" className="w-8 h-8 rounded-lg object-cover" />
              <span className="text-lg font-bold text-sidebar-foreground">CodeCampus</span>
            </Link>
            <button
              className="lg:hidden p-2 hover:bg-sidebar-accent rounded-lg"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-sidebar-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <nav ref={navRef} className="flex-1 p-4 space-y-1 min-h-0 overflow-y-hidden">
            {navigationItems.map((item) => (
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
                {item.badge && (
                  <Badge variant="default" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-sidebar-border flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-sidebar-foreground">{userName}</div>
                    <div className="text-xs text-muted-foreground">{userRole}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/profile" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/" className="flex items-center gap-2 text-destructive">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-30">
          <button
            className="lg:hidden p-2 hover:bg-secondary rounded-lg"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard/settings">
                <Settings className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
