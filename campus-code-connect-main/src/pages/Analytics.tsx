import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import API from "@/lib/api";
import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type DayMetric = {
  name: string;
  key: string;
  signups: number;
  posts: number;
};

function buildLast7Days(): DayMetric[] {
  const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const days: DayMetric[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);

    days.push({
      name: dayFormatter.format(date),
      key: date.toISOString().slice(0, 10),
      signups: 0,
      posts: 0,
    });
  }

  return days;
}

const Analytics = () => {
  const [data, setData] = useState<DayMetric[]>(() => buildLast7Days());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadAnalytics = async () => {
    try {
      // Keep auth token fresh so periodic analytics polling does not fail after token expiry.
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        localStorage.setItem("token", token);
      }

      const resp = await API.get("/auth/analytics/weekly");
      const rows = Array.isArray(resp.data?.data) ? resp.data.data : [];

      const normalized: DayMetric[] = rows.map((row: any) => ({
        name: row.name,
        key: row.key,
        signups: Number(row.signups || 0),
        posts: Number(row.posts || 0),
      }));

      setData(normalized.length > 0 ? normalized : buildLast7Days());
      setLoadError("");
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error: any) {
      setLoadError(error?.response?.data?.message || "Failed to load analytics");
    }
  };

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        await loadAnalytics();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    refresh();

    const channel = supabase
      .channel("analytics-live-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void loadAnalytics();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        void loadAnalytics();
      })
      .subscribe();

    const interval = window.setInterval(() => {
      void loadAnalytics();
    }, 15000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const totals = useMemo(() => {
    const signups = data.reduce((sum, day) => sum + day.signups, 0);
    const posts = data.reduce((sum, day) => sum + day.posts, 0);
    return { signups, posts };
  }, [data]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Last 7 Days Signups</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totals.signups}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Last 7 Days Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totals.posts}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Weekly activity: signups and posts (updates in realtime)
            </p>
            {loading && <p className="text-xs text-muted-foreground mb-2">Loading latest analytics...</p>}
            {!loading && loadError && <p className="text-xs text-destructive mb-2">{loadError}</p>}
            {!loading && !loadError && lastUpdated && (
              <p className="text-xs text-muted-foreground mb-2">Last updated: {lastUpdated}</p>
            )}
            <ChartContainer
              config={{ signups: { label: "Signups", color: "#7c3aed" }, posts: { label: "Posts", color: "#06b6d4" } }}
            >
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="signups" fill="#7c3aed" />
                <Bar dataKey="posts" fill="#06b6d4" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
