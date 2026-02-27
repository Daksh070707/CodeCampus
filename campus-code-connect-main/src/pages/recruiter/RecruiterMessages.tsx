import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Smile,
  Video,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import RecruiterLayout from "@/components/layout/RecruiterLayout";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { addRecruiterInterview } from "@/lib/recruiterStorage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (days === 1) {
    return "Yesterday";
  }
  if (days < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const RecruiterMessages = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [templateIndex, setTemplateIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const conversationChannelRef = useRef<RealtimeChannel | null>(null);
  const pendingConversationId = searchParams.get("conv");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesList]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUserId(data.profile?.id || null);
        }
      } catch (e) {
        console.warn("Failed to fetch current user", e);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    loadConversations();

    conversationChannelRef.current = supabase
      .channel("recruiter_conversations_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
      }
    };
  }, []);

  const loadConversations = async () => {
    setLoadingConvs(true);
    const token = localStorage.getItem("token");
    if (!token) return setLoadingConvs(false);

    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load conversations");
      const body = await res.json();
      setConversations(body.conversations || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingConvs(false);
    }
  };

  const loadMessages = async (conv: any) => {
    setLoadingMessages(true);
    const token = localStorage.getItem("token");
    if (!token) return setLoadingMessages(false);

    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
    }

    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations/${conv.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load messages");
      const body = await res.json();
      setMessagesList(body.messages || []);

      messageChannelRef.current = supabase
        .channel(`recruiter_messages_${conv.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conv.id}`,
          },
          async (payload) => {
            const newMsg = payload.new;

            const { data: profiles } = await supabase
              .from("profiles")
              .select("id,name,avatar_url")
              .eq("id", newMsg.sender_id)
              .limit(1);

            const profile = profiles && profiles[0];
            const enrichedMsg = {
              ...newMsg,
              author: profile?.name || "",
              avatar: profile?.avatar_url || "",
            };

            setMessagesList((prev) => {
              const exists = prev.some((m) => m.id === enrichedMsg.id);
              if (exists) return prev;
              return [...prev, enrichedMsg];
            });

            loadConversations();
          }
        )
        .subscribe();

      await markAsRead(conv.id);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase.rpc("mark_conversation_as_read", {
        conv_id: conversationId,
        usr_id: currentUserId,
      });
      if (error) {
        console.warn("Failed to mark as read:", error);
      }
    } catch (e) {
      console.warn("Error marking conversation as read:", e);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation) {
      alert("Please select a conversation first");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Sign in to send messages");
      return;
    }
    if (!newMessage.trim() || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: messageContent }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Send failed" }));
        throw new Error(error.message || "Send failed");
      }
    } catch (e: any) {
      alert(`Failed to send message: ${e.message || "Unknown error"}`);
      setNewMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEmojiClick = () => {
    const emojis = [":)", ":D", "<3", "👍", "🎉", "🔥", "💯", "✨"];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    setNewMessage((prev) => prev + randomEmoji);
  };

  const templates = [
    "Hi there! Thanks for applying. Can you share your availability this week?",
    "We would love to schedule a quick chat. Are you free for a 15-minute call?",
    "Thanks for your interest! Please share a recent project link or portfolio.",
  ];

  const handleUseTemplate = () => {
    const template = templates[templateIndex % templates.length];
    setTemplateIndex((prev) => prev + 1);
    setNewMessage(template);
  };

  const handleScheduleFromConversation = async () => {
    if (!selectedConversation) {
      toast({ title: "Select a conversation", description: "Choose a candidate first." });
      return;
    }
    const interview = await addRecruiterInterview({
      candidateName: selectedConversation.title || "Candidate",
      jobTitle: "",
      interviewer: "",
      date: null,
      time: null,
      location: "",
      status: "Scheduled",
      notes: "Scheduled from inbox",
    });
    if (interview) {
      toast({ title: "Interview draft created", description: "Finish details in Interviews." });
    } else {
      toast({ title: "Failed to create", description: "Could not create interview draft.", variant: "destructive" });
    }
  };

  const handleImageAttachment = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        setNewMessage((prev) => prev + ` [Image: ${file.name}]`);
        toast({ title: "Image attached", description: "Added to the message draft." });
      }
    };
    input.click();
  };

  const handleFileAttachment = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        setNewMessage((prev) => prev + ` [File: ${file.name}]`);
        toast({ title: "File attached", description: "Added to the message draft." });
      }
    };
    input.click();
  };

  const onSelectConv = async (conv: any) => {
    setSelectedConversation(conv);
    await loadMessages(conv);
    setShowMobileChat(true);
  };

  useEffect(() => {
    if (!pendingConversationId || conversations.length === 0) return;
    if (selectedConversation?.id === pendingConversationId) return;
    const match = conversations.find((conv) => String(conv.id) === String(pendingConversationId));
    if (match) {
      onSelectConv(match);
    }
  }, [pendingConversationId, conversations, selectedConversation]);

  useEffect(() => {
    return () => {
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
      }
      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
      }
    };
  }, []);

  return (
    <RecruiterLayout>
      <div className="space-y-6">
        <motion.div
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="text-3xl font-semibold">Recruiter Inbox</h1>
            <p className="text-muted-foreground">Manage candidate conversations and scheduling.</p>
          </div>
          <Button variant="outline" onClick={handleUseTemplate}>Message Templates</Button>
        </motion.div>

        <div className="h-[calc(100vh-12rem)] flex rounded-xl overflow-hidden border border-border bg-card">
          <motion.div
            className={`w-full md:w-80 border-r border-border flex-shrink-0 ${showMobileChat ? "hidden md:flex" : "flex"} flex-col`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search messages..." className="pl-10" />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {loadingConvs ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading...</div>
                ) : (conversations || []).length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No conversations yet</div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      className={`w-full p-3 rounded-lg flex items-start gap-3 transition-colors ${selectedConversation && selectedConversation.id === conv.id ? "bg-secondary" : "hover:bg-secondary/50"}`}
                      onClick={() => onSelectConv(conv)}
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback>{(conv.title || "").split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                        </Avatar>
                        {conv.unread_count > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1 bg-primary">
                            {conv.unread_count > 99 ? "99+" : conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium truncate ${conv.unread_count > 0 ? "font-bold" : ""}`}>
                            {conv.title || "Conversation"}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {conv.lastAt ? formatMessageTime(conv.lastAt) : ""}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${conv.unread_count > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {conv.lastMessage || "No messages yet"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>

          <motion.div
            className={`flex-1 flex flex-col ${showMobileChat ? "flex" : "hidden md:flex"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="h-16 px-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setShowMobileChat(false)}
                >
                  Back
                </Button>
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{(selectedConversation?.title || "").split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <div className="font-medium">{selectedConversation?.title || "Conversation"}</div>
                  <div className="text-xs text-muted-foreground">{selectedConversation ? "Active" : "Select a conversation"}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={handleScheduleFromConversation}>
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleScheduleFromConversation}>
                  <Video className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleScheduleFromConversation}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {loadingMessages ? (
                  <div className="text-sm text-muted-foreground">Loading messages...</div>
                ) : messagesList.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center mt-8">No messages yet. Start the conversation.</div>
                ) : (
                  messagesList.map((msg) => {
                    const isOwnMessage = currentUserId && msg.sender_id === currentUserId;
                    return (
                      <div key={msg.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        {!isOwnMessage && (
                          <Avatar className="w-8 h-8 mr-2">
                            <AvatarImage src={msg.avatar} />
                            <AvatarFallback>{msg.author?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isOwnMessage ? "bg-recruiter text-recruiter-foreground rounded-br-md" : "bg-secondary rounded-bl-md"}`}>
                          {!isOwnMessage && msg.author && (
                            <p className="text-xs font-semibold mb-1 opacity-70">{msg.author}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-xs opacity-70">
                            <span>
                              {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                            {isOwnMessage && <CheckCheck className="w-3 h-3 ml-1" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              {!selectedConversation ? (
                <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                  Select a conversation to start messaging
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleFileAttachment} title="Attach file">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleImageAttachment} title="Attach image">
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    className="flex-1"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={!selectedConversation || isSending}
                  />
                  <Button variant="ghost" size="icon" onClick={handleEmojiClick} title="Add emoji" disabled={isSending}>
                    <Smile className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="recruiter"
                    size="icon"
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !selectedConversation || isSending}
                    title={isSending ? "Sending..." : "Send message"}
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </RecruiterLayout>
  );
};

export default RecruiterMessages;
