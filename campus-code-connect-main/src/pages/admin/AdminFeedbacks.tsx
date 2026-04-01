import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type FeedbackItem = {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  status: "new" | "reviewing" | "addressed" | "closed";
  created_at: string;
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AdminFeedbacks = () => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  const token = localStorage.getItem("adminToken");

  const loadFeedbacks = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load feedbacks");
      }

      setItems(data.feedback || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load feedbacks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const updateStatus = async (id: string, status: FeedbackItem["status"]) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/feedback/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update status");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
              }
            : item
        )
      );

      toast({ title: "Updated", description: "Feedback status updated." });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchStatus = statusFilter === "all" ? true : item.status === statusFilter;
      const q = query.toLowerCase();
      const matchQuery =
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [items, query, statusFilter]);

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("isAdmin");
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-3xl font-bold">Received Feedbacks</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadFeedbacks} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="destructive" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Search by name, email, category, message..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="addressed">Addressed</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.email}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <span className="text-sm px-2 py-1 rounded bg-secondary w-fit">
                      {item.category}
                    </span>
                    <Select value={item.status} onValueChange={(value: FeedbackItem["status"]) => updateStatus(item.id, value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="reviewing">Reviewing</SelectItem>
                        <SelectItem value="addressed">Addressed</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.message}</p>
              </CardContent>
            </Card>
          ))}

          {!loading && filtered.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No feedback found.</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminFeedbacks;
