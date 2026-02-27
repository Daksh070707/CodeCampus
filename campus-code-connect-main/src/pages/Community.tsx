import { motion } from "framer-motion";
import { Plus, Search, Filter, Heart, MessageSquare, Bookmark, Share2, MoreHorizontal, Clock, Code2, Image as ImageIcon, Link as LinkIcon, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/profile";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Community = () => {
  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  
  // Attachment state
  const [codeSnippet, setCodeSnippet] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [documentLink, setDocumentLink] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  
  // File input refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = localStorage.getItem("user");
        if (!stored) return setLoading(false);
        const user = JSON.parse(stored);
        const id = user.id || user.uid || (user.user && user.user.id);
        if (!id) return setLoading(false);

        const p = await getProfile(id);
        setProfile(p);

        if (!p || !p.college) {
          setPosts([]);
          return setLoading(false);
        }

        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("college", p.college)
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
      alert("Please write something or attach a file");
      return;
    }
    const stored = localStorage.getItem("user");
    if (!stored) return;
    const user = JSON.parse(stored);

    try {
      const payload = {
        user_id: profile?.id ?? null,
        author: profile?.name || user.displayName || user.name || user.email || "Anonymous",
        content: postContent,
        code: codeSnippet || null,
        image: attachedImage || null,
        document_link: documentLink || null,
        college: profile?.college || null,
        created_at: new Date().toISOString(),
      };

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
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please select an image file");
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
          alert("Failed to process image");
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert("Failed to process image");
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

  const toggleBookmark = (post: any) => {
    const key = "bookmarkedPosts";
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    const exists = list.includes(post.id);
    const updated = exists ? list.filter((id: any) => id !== post.id) : [...list, post.id];
    localStorage.setItem(key, JSON.stringify(updated));
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, bookmarked: !exists } : p)));
  };

  const handleShare = async (post: any) => {
    setShowShareModal((s) => ({ ...s, [post.id]: true }));
  };

  const closeShareModal = (postId: any) => setShowShareModal((s) => ({ ...s, [postId]: false }));

  const shareToMessages = (post: any) => {
    navigate(`/dashboard/messages?sharePostId=${post.id}`);
    closeShareModal(post.id);
  };

  const copyShareLink = async (post: any) => {
    const url = `${window.location.origin}/dashboard/community#post-${post.id}`;
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
      const payload = { content: `Shared: ${post.content}`, title: null };
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

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div>
            <h1 className="text-2xl font-bold">College Community</h1>
            <p className="text-muted-foreground">Posts from students in your college</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
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
            <Input placeholder="Search posts, tags, or users..." className="pl-10" />
          </div>
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
            <div className="text-sm text-muted-foreground">Loading Community posts…</div>
          ) : posts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No posts yet in your college community.</div>
          ) : (
            posts.map((post, index) => (
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
                          <DropdownMenuItem>Report</DropdownMenuItem>
                          <DropdownMenuItem>Hide</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                      <p className="text-muted-foreground whitespace-pre-line">{post.content}</p>
                    </div>

                    {post.image && (
                      <div className="rounded-lg overflow-hidden">
                        <img src={post.image} alt="post" className="max-h-[300px] w-full object-cover" />
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

export default Community;
