import { motion } from "framer-motion";
import { Plus, Search, Filter, Heart, MessageSquare, Bookmark, Share2, MoreHorizontal, Clock, Code2, Image as ImageIcon, Link as LinkIcon, UserPlus, Send, X, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { getProfile } from "@/lib/profile";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const Feed = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, any>>({});
  
  // Attachment state
  const [codeSnippet, setCodeSnippet] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [documentLink, setDocumentLink] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tags: [] as string[],
  });
  
  // File input refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // try to load profile if available (for posting metadata), but always load global posts
        const stored = localStorage.getItem("user");
        if (stored) {
          const user = JSON.parse(stored);
          const id = user.id || user.uid || (user.user && user.user.id);
          if (id) {
            try {
              const p = await getProfile(id);
              setProfile(p);
            } catch (e) {
              // ignore profile load errors
            }
          }
        }

        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .or("source.eq.feed,and(source.is.null,college.is.null)")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Failed to load posts:", error);
          setPosts([]);
        } else {
          setPosts(data || []);

          // mark posts liked by current user
          try {
            const stored = localStorage.getItem("user");
            const user = stored ? JSON.parse(stored) : null;
            const uid = user ? user.id || user.uid || (user.user && user.user.id) : null;
            if (uid && Array.isArray(data) && data.length > 0) {
              const ids = data.map((p: any) => p.id).filter(Boolean);
              const { data: likes } = await supabase.from("likes").select("post_id").in("post_id", ids).eq("user_id", uid);
              const likedIds = new Set((likes || []).map((l: any) => l.post_id));
              setPosts((data || []).map((p: any) => ({ ...p, liked: likedIds.has(p.id) })));
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handlePost = async () => {
    if (!postContent.trim() && !codeSnippet.trim() && !attachedImage && !documentLink.trim()) {
      toast({ title: "Error", description: "Please write something or attach a file", variant: "destructive" });
      return;
    }
    const stored = localStorage.getItem("user");
    if (!stored) return;
    const user = JSON.parse(stored);
    const id = user.id || user.uid || (user.user && user.user.id);

    try {
      // use loaded profile if available, fallback to stored user fields
      const payload = {
        // posts.user_id is a UUID referencing profiles.id — prefer the loaded profile UUID
        user_id: profile?.id ?? null,
        author: profile?.name || user.displayName || user.name || user.email || "Anonymous",
        content: postContent,
        code: codeSnippet || null,
        image: attachedImage || null,
        document_link: documentLink || null,
        college: null,
        source: "feed",
        created_at: new Date().toISOString(),
      };

      // Send to backend which verifies Firebase token and inserts using service role
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("Missing auth token for post request");
        return;
      }

      const res = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.warn("Failed to insert post:", errBody);
        toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
        return;
      }
      const body = await res.json().catch(() => ({}));
      const post = body.post || null;
      if (post) {
        setPosts((prev) => [post, ...prev]);
        setPostContent("");
        setCodeSnippet("");
        setAttachedImage(null);
        setDocumentLink("");
        setShowComposer(false);
        toast({ title: "Success", description: "Post created!" });
      }
    } catch (err) {
      console.warn(err);
      toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    try {
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
              // Convert to base64 with reduced quality (0.75 = 75%)
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
              setAttachedImage(compressedBase64);
            }
          } catch (compressErr) {
            console.error("Image compression error:", compressErr);
            // Fallback: use original base64
            const base64 = event.target?.result as string;
            setAttachedImage(base64);
          }
        };
        img.onerror = () => {
          toast({ title: "Error", description: "Failed to process image", variant: "destructive" });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ title: "Error", description: "Failed to process image", variant: "destructive" });
    }
  };

  const handleCodeAdd = () => {
    if (codeSnippet.trim()) {
      setShowCodeInput(false);
    }
  };

  const handleLinkAdd = () => {
    if (documentLink.trim()) {
      setShowLinkInput(false);
    }
  };

  const getCurrentUserId = () => {
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    const user = JSON.parse(stored);
    return user.id || user.uid || (user.user && user.user.id) || null;
  };

  async function toggleLike(post: any) {
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("Missing auth token");
      return;
    }
    try {
      if (post.liked) {
        const res = await fetch(`${API_BASE}/api/posts/${post.id}/like`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed to remove like");
        setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, liked: false, likes: Math.max(0, (p.likes || 0) - 1) } : p)));
      } else {
        const res = await fetch(`${API_BASE}/api/posts/${post.id}/like`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed to add like");
        setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, liked: true, likes: (p.likes || 0) + 1 } : p)));
      }
    } catch (err) {
      console.warn("Like error", err);
    }
  }

  async function addComment(post: any, text: string) {
    if (!text || !text.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("Missing auth token");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to add comment");
      }
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, comments: (p.comments || 0) + 1 } : p)));
    } catch (err) {
      console.warn("Comment error", err);
    }
  }

  const toggleBookmark = (post: any) => {
    const key = "bookmarkedPosts";
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    const exists = list.includes(post.id);
    let updated;
    if (exists) {
      updated = list.filter((id: any) => id !== post.id);
    } else {
      updated = [...list, post.id];
    }
    localStorage.setItem(key, JSON.stringify(updated));
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, bookmarked: !exists } : p)));
  };

  // comment input state per post
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showCommentBox, setShowCommentBox] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, any[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [showShareModal, setShowShareModal] = useState<Record<string, boolean>>({});

  const setCommentFor = (postId: any, value: string) => {
    setCommentInputs((s) => ({ ...s, [postId]: value }));
  };

  const submitComment = async (post: any) => {
    const text = (commentInputs as any)[post.id] || "";
    await addComment(post, text);
    setCommentFor(post.id, "");
    setShowCommentBox((s) => ({ ...s, [post.id]: false }));
    await loadComments(post);
  };

  const loadComments = async (post: any) => {
    setCommentsLoading((s) => ({ ...s, [post.id]: true }));
    try {
      const { data } = await supabase
        .from("comments")
        .select("id,content,user_id,created_at")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!data) {
        setCommentsByPost((s) => ({ ...s, [post.id]: [] }));
        return;
      }

      const uids = Array.from(new Set((data || []).map((c: any) => c.user_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};
      if (uids.length) {
        const { data: profiles } = await supabase.from("profiles").select("id,name,avatar_url").in("id", uids);
        (profiles || []).forEach((p: any) => (profilesMap[p.id] = p));
      }

      const enriched = (data || []).map((c: any) => ({
        ...c,
        author: profilesMap[c.user_id]?.name || "Anonymous",
        avatar: profilesMap[c.user_id]?.avatar_url || "",
      }));

      setCommentsByPost((s) => ({ ...s, [post.id]: enriched }));
    } catch (e) {
      console.warn("Failed to load comments", e);
      setCommentsByPost((s) => ({ ...s, [post.id]: [] }));
    } finally {
      setCommentsLoading((s) => ({ ...s, [post.id]: false }));
    }
  };

  const handleShare = async (post: any) => {
    setShowShareModal((s) => ({ ...s, [post.id]: true }));
  };

  const deletePost = async (post: any) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const ok = window.confirm("Delete this post? This action cannot be undone.");
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/posts/${post.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Failed to delete post");
      }

      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast({ title: "Deleted", description: "Your post was deleted." });
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const closeShareModal = (postId: any) => setShowShareModal((s) => ({ ...s, [postId]: false }));

  const shareToMessages = (post: any) => {
    navigate(`/dashboard/messages?sharePostId=${post.id}`);
    closeShareModal(post.id);
  };

  const copyShareLink = async (post: any) => {
    const url = `${window.location.origin}/dashboard/feed#post-${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard");
    } catch (e) {
      prompt("Copy link:", url);
    }
    closeShareModal(post.id);
  };

  const shareToCommunity = async (post: any) => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Sign in to share");
    try {
      const payload = { content: `Shared: ${post.content}`, title: null, source: "community" };
      const res = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to share to community");
      alert("Shared to community");
    } catch (e) {
      console.warn(e);
      alert("Share failed");
    }
    closeShareModal(post.id);
  };

  // Check connection status with post author
  const checkConnectionStatus = async (userId: string) => {
    const token = localStorage.getItem("token");
    if (!token || !userId) return;

    try {
      const res = await fetch(`${API_BASE}/api/connections/status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConnectionStatuses(prev => ({ ...prev, [userId]: data }));
      }
    } catch (e) {
      console.warn("Failed to check connection status", e);
    }
  };

  // Send friend request
  const sendFriendRequest = async (post: any) => {
    if (!post.user_id) {
      toast({ title: "Error", description: "Cannot add this user", variant: "destructive" });
      console.warn("Post user_id is missing:", post);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Error", description: "Please sign in to send friend requests", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/connections/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friend_id: post.user_id })
      });

      const data = await res.json();
      if (res.ok) {
        toast({ title: "Success", description: data.message || "Friend request sent!" });
        await checkConnectionStatus(post.user_id);
      } else {
        toast({ title: "Error", description: data.message || "Failed to send friend request", variant: "destructive" });
      }
    } catch (e) {
      console.error("Friend request error:", e);
      toast({ title: "Error", description: "Failed to send friend request", variant: "destructive" });
    }
  };

  // Start conversation with post author
  const startConversation = async (post: any) => {
    if (!post.user_id) {
      toast({ title: "Error", description: "Cannot message this user", variant: "destructive" });
      console.warn("Post user_id is missing:", post);
      return;
    }

    // Check if it's current user's own post
    if (profile && profile.id === post.user_id) {
      toast({ title: "Info", description: "You cannot message yourself", variant: "default" });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Error", description: "Please sign in to send messages", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/connections/start-conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friend_id: post.user_id })
      });

      if (res.ok) {
        const data = await res.json();
        // Navigate to messages page with the conversation
        navigate("/dashboard/messages");
        toast({ title: "Success", description: "Conversation started" });
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.message || "Failed to start conversation", variant: "destructive" });
      }
    } catch (e) {
      console.error("Start conversation error:", e);
      toast({ title: "Error", description: "Failed to start conversation", variant: "destructive" });
    }
  };

  const reportPost = async (post: any) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Error", description: "Please sign in to report content", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/feedback/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportedItemId: post.id,
          reportedAuthor: post.author || "Unknown",
          reportedContent: post.content || "",
          reason: "Reported from feed menu",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to submit report");
      }

      toast({ title: "Success", description: "Reported successfully" });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to submit report",
        variant: "destructive",
      });
    }
  };

  // Load connection statuses for all posts
  useEffect(() => {
    if (profile && posts.length > 0) {
      posts.forEach(post => {
        if (post.user_id && post.user_id !== profile.id) {
          checkConnectionStatus(post.user_id);
        }
      });
    }
  }, [posts, profile]);

  // Filter posts based on search and tag filters
  const getFilteredPosts = () => {
    return posts.filter(post => {
      // Search filter - search in title, content, author, and tags
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches = 
          (post.title && post.title.toLowerCase().includes(query)) ||
          (post.content && post.content.toLowerCase().includes(query)) ||
          (post.author && post.author.toLowerCase().includes(query)) ||
          (Array.isArray(post.tags) && post.tags.some((tag: string) => tag.toLowerCase().includes(query)));
        
        if (!matches) return false;
      }
      
      // Tag filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = Array.isArray(post.tags) && 
          filters.tags.some(tag => (post.tags || []).includes(tag));
        if (!hasMatchingTag) return false;
      }
      
      return true;
    });
  };

  const filteredPosts = getFilteredPosts();

  // Get unique tags from all posts for filter UI
  const availableTags = Array.from(new Set(
    posts.flatMap(post => post.tags || [])
  )).sort() as string[];

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setFilters({ tags: [] });
  };

  const hasActiveFilters = searchQuery || filters.tags.length > 0;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div>
            <h1 className="text-2xl font-bold">Feed</h1>
            <p className="text-muted-foreground">See what your peers are building</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="hero" onClick={() => setShowComposer(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search posts, tags, or users..." 
              className="pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter UI */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold mb-3 block">Filter by Tags</Label>
                      {availableTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {availableTags.map(tag => (
                            <Badge
                              key={tag}
                              variant={filters.tags.includes(tag) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                setFilters(prev => ({
                                  ...prev,
                                  tags: prev.tags.includes(tag)
                                    ? prev.tags.filter(t => t !== tag)
                                    : [...prev.tags, tag]
                                }));
                              }}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No tags available yet</p>
                      )}
                    </div>
                    
                    {hasActiveFilters && (
                      <div className="flex justify-end pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          <X className="w-4 h-4 mr-2" />
                          Clear filters
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>

        {showComposer && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-4">
                    <Textarea placeholder="Share your project, ask a question, or start a discussion..." className="min-h-[120px] resize-none" value={postContent} onChange={(e) => setPostContent(e.target.value)} />
                    
                    {/* Attachment Display Section */}
                    <div className="space-y-2">
                      {attachedImage && (
                        <div className="relative">
                          <img src={attachedImage} alt="attached" className="max-h-[200px] rounded-lg" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAttachedImage(null)}
                            className="absolute top-1 right-1 bg-black/50 hover:bg-black/70"
                          >
                            <X className="w-4 h-4 text-white" />
                          </Button>
                        </div>
                      )}
                      
                      {codeSnippet && (
                        <div className="relative bg-secondary/50 rounded-lg p-3">
                          <pre className="text-xs overflow-x-auto text-muted-foreground whitespace-pre-wrap break-words">
                            <code>{codeSnippet.substring(0, 100)}{codeSnippet.length > 100 ? '...' : ''}</code>
                          </pre>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCodeSnippet("")}
                            className="absolute top-1 right-1 h-6 w-6"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      
                      {documentLink && (
                        <div className="relative bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-muted-foreground" />
                          <a href={documentLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate">
                            {documentLink}
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDocumentLink("")}
                            className="absolute top-1 right-1 h-6 w-6"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Code Input Section */}
                    {showCodeInput && (
                      <div className="space-y-2 border-t pt-2">
                        <Textarea
                          ref={codeInputRef}
                          placeholder="Paste your code here..."
                          className="min-h-[100px] font-mono text-xs"
                          value={codeSnippet}
                          onChange={(e) => setCodeSnippet(e.target.value)}
                        />
                        <Button size="sm" onClick={handleCodeAdd}>
                          Add Code
                        </Button>
                      </div>
                    )}

                    {/* Link Input Section */}
                    {showLinkInput && (
                      <div className="space-y-2 border-t pt-2">
                        <Input
                          type="url"
                          placeholder="Paste document/link URL..."
                          value={documentLink}
                          onChange={(e) => setDocumentLink(e.target.value)}
                        />
                        <Button size="sm" onClick={handleLinkAdd}>
                          Add Link
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowCodeInput(!showCodeInput)}
                          title="Add code snippet"
                        >
                          <Code2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => imageInputRef.current?.click()}
                          title="Add photo"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowLinkInput(!showLinkInput)}
                          title="Add document link"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => {
                          setShowComposer(false);
                          setShowCodeInput(false);
                          setShowLinkInput(false);
                        }}>
                          Cancel
                        </Button>
                        <Button onClick={handlePost}>Post</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              {/* Hidden file input */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </Card>
          </motion.div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading Feed…</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-sm text-muted-foreground mb-2">
                {posts.length === 0 ? "No posts yet in Feed." : "No posts match your filters."}
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                  Clear filters to see all posts
                </Button>
              )}
            </div>
          ) : (
            filteredPosts.map((post, index) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}>
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={post.avatar || post.avatar_url} />
                          <AvatarFallback>{(post.author || "").split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{post.author}</span>
                            <Badge variant="outline" className="text-xs">
                              {post.role}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{post.college}</span>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>{post.time || (post.created_at ? new Date(post.created_at).toLocaleString() : "")}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {profile && profile.id === post.user_id && (
                            <DropdownMenuItem onClick={() => deletePost(post)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Post
                            </DropdownMenuItem>
                          )}
                          {profile && profile.id !== post.user_id && (
                            <>
                              <DropdownMenuItem onClick={() => startConversation(post)}>
                                <Send className="w-4 h-4 mr-2" />
                                Message
                              </DropdownMenuItem>
                              {connectionStatuses[post.user_id]?.status !== "friends" && (
                                <DropdownMenuItem onClick={() => sendFriendRequest(post)}>
                                  <UserPlus className="w-4 h-4 mr-2" />
                                  Add Friend
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => reportPost(post)}>Report</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                      <p className="text-muted-foreground whitespace-pre-line">{post.content}</p>
                    </div>

                    {(post.image || post.image_url) && (
                      <div className="rounded-lg overflow-hidden">
                        <img src={post.image || post.image_url} alt="post" className="max-h-[300px] w-full object-cover" />
                      </div>
                    )}

                    {post.code && (
                      <div className="bg-secondary/50 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm font-mono text-foreground">
                          <code>{post.code}</code>
                        </pre>
                      </div>
                    )}

                    {post.document_link && (
                      <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                        <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <a href={post.document_link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate">
                          {post.document_link}
                        </a>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(post.tags) && post.tags.map((tag: string) => (
                        <Badge key={tag} variant="skill" className="text-xs cursor-pointer hover:bg-primary/20">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => toggleLike(post)} className={post.liked ? "text-destructive" : ""}>
                            <Heart className={`w-4 h-4 mr-1 ${post.liked ? "fill-current" : ""}`} />
                            {post.likes}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setShowCommentBox((s) => {
                                const opening = !s[post.id];
                                if (opening) loadComments(post);
                                return { ...s, [post.id]: opening };
                              })
                            }
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            {post.comments}
                          </Button>
                        </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggleBookmark(post)} className={post.bookmarked ? "text-primary" : ""}>
                          <Bookmark className={`w-4 h-4 ${post.bookmarked ? "fill-current" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleShare(post)}>
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                  {showCommentBox[post.id] && (
                    <div className="px-4 pb-4 pt-0">
                      {/* comments list */}
                      <div className="space-y-3 mb-3">
                        {commentsLoading[post.id] ? (
                          <div className="text-sm text-muted-foreground">Loading comments…</div>
                        ) : (commentsByPost[post.id] || []).length === 0 ? (
                          <div className="text-sm text-muted-foreground">No comments yet — be the first to reply.</div>
                        ) : (
                          (commentsByPost[post.id] || []).map((c: any) => (
                            <div key={c.id} className="flex items-start gap-3">
                              <Avatar className="w-8 h-8">
                                {c.avatar ? <AvatarImage src={c.avatar} /> : <AvatarFallback>{(c.author || "").split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>}
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium">{c.author}</div>
                                <div className="text-sm text-muted-foreground">{c.content}</div>
                                <div className="text-xs text-muted-foreground mt-1">{c.created_at ? new Date(c.created_at).toLocaleString() : ""}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex items-start gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>ME</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Textarea
                            className="min-h-[64px] mb-2"
                            placeholder="Write a thoughtful comment..."
                            value={(commentInputs as any)[post.id] || ""}
                            onChange={(e) => setCommentFor(post.id, e.target.value)}
                          />
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => submitComment(post)}>
                              Comment
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowCommentBox((s) => ({ ...s, [post.id]: false }))}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Share modal rendered at top level - fixed position */}
        {Object.keys(showShareModal).map((postId) => (
          showShareModal[postId] && (
            <div key={postId} className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={() => closeShareModal(postId)} />
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 w-[320px] z-10 pointer-events-auto">
                <h4 className="font-medium mb-3">Share post</h4>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => {
                    const post = posts.find(p => p.id === postId);
                    if (post) shareToMessages(post);
                  }}>Send in Message</Button>
                  <Button variant="outline" onClick={() => {
                    const post = posts.find(p => p.id === postId);
                    if (post) copyShareLink(post);
                  }}>Copy Link</Button>
                  <Button variant="ghost" onClick={() => {
                    const post = posts.find(p => p.id === postId);
                    if (post) shareToCommunity(post);
                  }}>Share to Community</Button>
                  <Button variant="ghost" onClick={() => closeShareModal(postId)}>Close</Button>
                </div>
              </div>
            </div>
          )
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Feed;
