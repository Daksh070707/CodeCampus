import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

const Saved = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const raw = localStorage.getItem("bookmarkedPosts");
        const ids = raw ? JSON.parse(raw) : [];
        if (!ids || ids.length === 0) {
          setPosts([]);
          return;
        }
        const { data, error } = await supabase.from("posts").select("*").in("id", ids).order("created_at", { ascending: false });
        if (error) {
          console.warn("Failed to load saved posts:", error);
          setPosts([]);
        } else {
          setPosts(data || []);
        }
      } catch (e) {
        console.warn(e);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="">
          <h1 className="text-2xl font-bold">Saved Posts</h1>
          <p className="text-muted-foreground">Posts you've saved for later</p>
        </motion.div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading saved posts…</div>
          ) : posts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No saved posts yet.</div>
          ) : (
            posts.map((post) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.avatar || post.avatar_url} />
                        <AvatarFallback>{(post.author || "").split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{post.author}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2"><span>{post.college}</span><span>•</span><Clock className="w-3 h-3"/>{post.time || (post.created_at ? new Date(post.created_at).toLocaleString() : "")}</div>
                      </div>
                      <div className="flex-1" />
                      <Badge variant="outline" className="text-xs">Saved</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{post.content}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Saved;
