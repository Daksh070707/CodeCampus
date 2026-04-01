import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  Send, 
  Phone, 
  Video, 
  MoreVertical,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper function to format message time
const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

const Messages = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string } | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const conversationChannelRef = useRef<RealtimeChannel | null>(null);

  const location = useLocation();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesList]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shareId = params.get("sharePostId");
    if (shareId) {
      const url = `${window.location.origin}/dashboard/feed#post-${shareId}`;
      setNewMessage(`Check out this post: ${url}`);
    }
  }, [location.search]);

  // Get current user profile
  useEffect(() => {
    const fetchCurrentUser = async () => {
      console.log("[AUTH] Fetching current user profile...");
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("[AUTH] No token found");
        return;
      }
      
      try {
        const res = await fetch(`${API_BASE}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("[AUTH] Profile response status:", res.status);
        
        if (res.ok) {
          const data = await res.json();
          const userId = data.profile?.id;
          console.log("[AUTH] Current user ID:", userId);
          setCurrentUserId(userId);
        } else {
          const error = await res.json().catch(() => ({}));
          console.warn("[AUTH] Failed to get profile:", error);
        }
      } catch (e) {
        console.warn("[AUTH] Error fetching current user:", e);
      }
    };
    
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    console.log("Messages component mounted, loading conversations...");
    loadConversations();
    
    // Subscribe to conversation updates (new conversations, updated timestamps)
    conversationChannelRef.current = supabase
      .channel('conversations_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          // Reload conversations when any conversation changes
          console.log("Conversation updated via real-time, reloading...");
          loadConversations();
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      if (conversationChannelRef.current) {
        supabase.removeChannel(conversationChannelRef.current);
      }
    };
  }, []);

  const loadConversations = async () => {
    setLoadingConvs(true);
    console.log("[CONVERSATIONS] Starting to load conversations...");
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("[CONVERSATIONS] No token found");
      return setLoadingConvs(false);
    }
    try {
      console.log("[CONVERSATIONS] Fetching from:", `${API_BASE}/api/messages/conversations`);
      const res = await fetch(`${API_BASE}/api/messages/conversations`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      console.log("[CONVERSATIONS] Response status:", res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      
      const body = await res.json();
      console.log("[CONVERSATIONS] Loaded successfully, count:", body.conversations?.length || 0);
      console.log("[CONVERSATIONS] Data:", body.conversations);
      setConversations(body.conversations || []);
    } catch (e) {
      console.error("[CONVERSATIONS] Error:", e);
    } finally {
      setLoadingConvs(false);
    }
  };

  const loadMessages = async (conv: any) => {
    setLoadingMessages(true);
    console.log("[MESSAGES] Loading messages for conversation:", conv.id, conv.title);
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("[MESSAGES] No token found");
      return setLoadingMessages(false);
    }
    
    // Unsubscribe from previous conversation's messages
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
    }
    
    try {
      console.log("[MESSAGES] Fetching from:", `${API_BASE}/api/messages/conversations/${conv.id}/messages`);
      const res = await fetch(`${API_BASE}/api/messages/conversations/${conv.id}/messages`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      console.log("[MESSAGES] Response status:", res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      
      const body = await res.json();
      console.log("[MESSAGES] Loaded successfully, count:", body.messages?.length || 0);
      setMessagesList(body.messages || []);
      
      // Subscribe to real-time messages for this conversation
      console.log("[MESSAGES] Subscribing to real-time updates for conversation:", conv.id);
      messageChannelRef.current = supabase
        .channel(`messages_${conv.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conv.id}`
          },
          async (payload) => {
            console.log("[MESSAGES] Real-time message received:", payload.new);
            const newMsg = payload.new;
            
            // Fetch sender profile info
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id,name,avatar_url')
              .eq('id', newMsg.sender_id)
              .limit(1);
            
            const profile = profiles && profiles[0];
            const enrichedMsg = {
              ...newMsg,
              author: profile?.name || '',
              avatar: profile?.avatar_url || ''
            };
            
            // Add to messages list if not already there
            setMessagesList(prev => {
              const exists = prev.some(m => m.id === enrichedMsg.id);
              if (exists) {
                console.log("[MESSAGES] Message already in list, skipping duplicate");
                return prev;
              }
              console.log("[MESSAGES] Adding new message to list");
              return [...prev, enrichedMsg];
            });
            
            // Update conversations list to show new last message
            loadConversations();
          }
        )
        .subscribe();
      
      // Mark conversation as read
      await markAsRead(conv.id);
      
    } catch (e) {
      console.error("[MESSAGES] Error:", e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!currentUserId) {
      console.log("[READ] No current user ID, skipping mark as read");
      return;
    }
    
    console.log("[READ] Marking conversation as read:", conversationId);
    
    try {
      // Call the mark_conversation_as_read function
      const { error } = await supabase.rpc('mark_conversation_as_read', {
        conv_id: conversationId,
        usr_id: currentUserId
      });
      
      if (error) {
        console.warn('[READ] Failed to mark as read:', error);
      } else {
        console.log('[READ] Successfully marked as read');
      }
    } catch (e) {
      console.warn('[READ] Error marking conversation as read:', e);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation) {
      console.warn("[SEND] No conversation selected");
      alert("Please select a conversation first");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("[SEND] No token found");
      alert("Sign in to send messages");
      return;
    }
    const messageText = newMessage.trim();
    if (!messageText && !attachedImage && !attachedFile) {
      console.log("[SEND] Skipping - empty message and no attachments");
      return;
    }
    if (isSending) {
      console.log("[SEND] Already sending a message");
      return;
    }
    
    setIsSending(true);
    
    console.log("[SEND] Sending message...", {
      conversationId: selectedConversation.id,
      hasContent: messageText.length > 0,
      hasImage: !!attachedImage,
      hasFile: !!attachedFile,
      apiBase: API_BASE
    });
    
    try {
      const url = `${API_BASE}/api/messages/conversations/${selectedConversation.id}/messages`;
      console.log("[SEND] POST to:", url);
      
      const payload: any = { 
        content: messageText 
      };
      
      if (attachedImage) {
        payload.image_url = attachedImage;
      }
      if (attachedFile) {
        payload.attachment_url = attachedFile.url;
        payload.attachment_name = attachedFile.name;
      }
      
      const res = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });
      
      console.log("[SEND] Response status:", res.status);
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Send failed" }));
        console.error("[SEND] Error response:", error);
        throw new Error(error.message || `HTTP ${res.status}`);
      }
      
      const responseData = await res.json();
      console.log("[SEND] Message sent successfully:", responseData);
      
      // Optimistically add the message to the list immediately
      const sentMessage = {
        id: responseData.message?.id || Date.now().toString(),
        conversation_id: selectedConversation.id,
        sender_id: currentUserId,
        content: messageText,
        image_url: attachedImage || null,
        attachment_url: attachedFile?.url || null,
        attachment_name: attachedFile?.name || null,
        created_at: new Date().toISOString(),
        author: currentUserId,
        avatar: ""
      };
      
      console.log("[SEND] Adding message optimistically:", sentMessage);
      setMessagesList(prev => [...prev, sentMessage]);
      
      // Clear inputs
      setNewMessage("");
      setAttachedImage(null);
      setAttachedFile(null);
      
    } catch (e: any) {
      console.error("[SEND] Error:", e);
      alert(`Failed to send message: ${e.message || "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!selectedConversation) return;
    
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to delete messages");
      return;
    }

    if (!confirm("Are you sure you want to delete this message? This cannot be undone.")) {
      return;
    }

    try {
      console.log("[DELETE] Deleting message:", messageId);
      
      const url = `${API_BASE}/api/messages/conversations/${selectedConversation.id}/messages/${messageId}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("[DELETE] Response status:", res.status);

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(error.message || `HTTP ${res.status}`);
      }

      console.log("[DELETE] Message deleted successfully");
      
      // Remove message from list
      setMessagesList(prev => prev.filter(msg => msg.id !== messageId));
    } catch (e: any) {
      console.error("[DELETE] Error:", e);
      alert(`Failed to delete message: ${e.message || "Unknown error"}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEmojiClick = () => {
    // Simple emoji picker - you can enhance this with a proper emoji picker library
    const emojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '✨'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    setNewMessage(prev => prev + randomEmoji);
  };

  const handleImageAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        console.log("[IMAGE] Selected image:", file.name, file.size);
        try {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            console.log("[IMAGE] Converted to base64, length:", base64.length);
            setAttachedImage(base64);
          };
          reader.readAsDataURL(file);
        } catch (err) {
          console.error("[IMAGE] Error reading file:", err);
          alert('Failed to read image file');
        }
      }
    };
    input.click();
  };

  const handleFileAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        console.log("[FILE] Selected file:", file.name, file.size);
        try {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result as string;
            console.log("[FILE] Converted to base64, length:", base64.length);
            setAttachedFile({ url: base64, name: file.name });
          };
          reader.readAsDataURL(file);
        } catch (err) {
          console.error("[FILE] Error reading file:", err);
          alert('Failed to read file');
        }
      }
    };
    input.click();
  };

  const clearAttachments = () => {
    setAttachedImage(null);
    setAttachedFile(null);
  };

  const onSelectConv = async (conv: any) => {
    setSelectedConversation(conv);
    await loadMessages(conv);
    setShowMobileChat(true);
  };

  const handlePhoneCall = () => {
    if (!selectedConversation) {
      alert("Please select a conversation first");
      return;
    }
    console.log("[CALL] Initiating phone call with:", selectedConversation.title);
    alert("Phone call feature coming soon! (Integration with WebRTC or Jitsi Meet)");
  };

  const handleVideoCall = () => {
    if (!selectedConversation) {
      alert("Please select a conversation first");
      return;
    }
    console.log("[CALL] Initiating video call with:", selectedConversation.title);
    alert("Video call feature coming soon! (Integration with WebRTC or Jitsi Meet)");
  };

  const handleMoreOptions = () => {
    if (!selectedConversation) {
      alert("Please select a conversation first");
      return;
    }
    console.log("[MENU] More options for conversation:", selectedConversation.title);
    // You can implement a menu here for options like:
    // - Clear conversation
    // - Mute notifications
    // - Delete conversation
    // - Block user
    alert("More options coming soon! (Clear, Mute, Delete, Block)");
  };

  // Cleanup on unmount
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

  // rest of component renders below
  
  
  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex rounded-xl overflow-hidden border border-border bg-card">
        {/* Conversations List */}
        <motion.div
          className={`w-full md:w-80 border-r border-border flex-shrink-0 ${showMobileChat ? "hidden md:flex" : "flex"} flex-col`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {loadingConvs ? (
                <div className="p-4 text-sm text-muted-foreground">Loading…</div>
              ) : (conversations || []).length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">No conversations yet</div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    className={`w-full p-3 rounded-lg flex items-start gap-3 transition-all duration-200 ${
                      selectedConversation && selectedConversation.id === conv.id 
                        ? "bg-primary/10 border border-primary/30" 
                        : "hover:bg-secondary/50 active:bg-secondary/70"
                    }`}
                    onClick={() => onSelectConv(conv)}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>{(conv.title || "").split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      {/* Online Status Indicator */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium truncate ${conv.unread_count > 0 ? 'font-bold text-foreground' : ''}`}>
                          {conv.title || "Conversation"}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {conv.lastAt ? formatMessageTime(conv.lastAt) : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate flex-1 ${conv.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                          {conv.lastMessage || "No messages yet"}
                        </p>
                        {conv.unread_count > 0 && (
                          <Badge className="ml-2 h-5 min-w-5 flex items-center justify-center text-xs px-1.5 bg-primary text-primary-foreground rounded-full flex-shrink-0">
                            {conv.unread_count > 99 ? '99+' : conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </motion.div>

        {/* Chat Area */}
        <motion.div
          className={`flex-1 flex flex-col ${showMobileChat ? "flex" : "hidden md:flex"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Chat Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setShowMobileChat(false)}
              >
                ←
              </Button>
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>{(selectedConversation?.title || "").split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                </Avatar>
                {/* Online Status Indicator */}
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"></div>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">{selectedConversation?.title || "Conversation"}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {selectedConversation ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Active now</span>
                    </>
                  ) : (
                    "Select a conversation"
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePhoneCall} 
                title="Start phone call"
                className="hover:text-green-500"
              >
                <Phone className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleVideoCall} 
                title="Start video call"
                className="hover:text-blue-500"
              >
                <Video className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleMoreOptions} 
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {loadingMessages ? (
                <div className="text-sm text-muted-foreground">Loading messages…</div>
              ) : messagesList.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center mt-8">No messages yet. Start the conversation!</div>
              ) : (
                <>
                  {messagesList.reduce((groups: any[], msg, index) => {
                    const messageDate = msg.created_at ? new Date(msg.created_at).toLocaleDateString() : "";
                    const lastMessageDate = index > 0 && messagesList[index - 1].created_at 
                      ? new Date(messagesList[index - 1].created_at).toLocaleDateString() 
                      : null;
                    
                    if (messageDate !== lastMessageDate) {
                      groups.push({ type: 'date', date: messageDate, key: `date-${messageDate}` });
                    }
                    
                    groups.push({ type: 'message', data: msg, key: msg.id });
                    return groups;
                  }, []).map((item) => {
                    if (item.type === 'date') {
                      return (
                        <div key={item.key} className="flex items-center justify-center my-4">
                          <div className="bg-border h-px flex-1"></div>
                          <span className="px-3 text-xs text-muted-foreground">{item.date}</span>
                          <div className="bg-border h-px flex-1"></div>
                        </div>
                      );
                    }

                    const msg = item.data;
                    const isOwnMessage = currentUserId && msg.sender_id === currentUserId;
                    const isUnread = msg.is_read === false && !isOwnMessage;

                    return (
                      <div
                        key={item.key}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} group hover:opacity-100 transition-opacity`}
                      >
                        {!isOwnMessage && (
                          <Avatar className="w-8 h-8 mr-2 flex-shrink-0">
                            <AvatarImage src={msg.avatar} />
                            <AvatarFallback>{msg.author?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[70%] space-y-1`}>
                          {!isOwnMessage && msg.author && (
                            <p className="text-xs font-semibold px-4 opacity-70">{msg.author}</p>
                          )}
                          <div className={`rounded-2xl px-4 py-2 ${isOwnMessage ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary rounded-bl-md"} ${isUnread ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            
                            {/* Image Attachment */}
                            {msg.image_url && (
                              <div className="mt-3 rounded-lg overflow-hidden bg-black/10 max-w-sm">
                                <img 
                                  src={msg.image_url} 
                                  alt="message-image" 
                                  className="w-full h-auto object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' fill='%23999' font-size='16'%3EImage not found%3C/text%3E%3C/svg%3E";
                                  }}
                                />
                              </div>
                            )}
                            
                            {/* File/Other Attachments */}
                            {msg.attachment_url && !msg.image_url && (
                              <div className="mt-3">
                                <a 
                                  href={msg.attachment_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-3 bg-opacity-20 bg-primary/20 rounded-lg hover:bg-opacity-30 transition-colors max-w-sm"
                                >
                                  <Paperclip className="w-5 h-5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{msg.attachment_name || 'Download file'}</p>
                                    <p className="text-xs opacity-70">Click to open</p>
                                  </div>
                                </a>
                              </div>
                            )}
                            
                            {/* Other Attachments (from attachments array) */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {msg.attachments.map((attachment: any, idx: number) => (
                                  <div key={idx} className="relative rounded-lg overflow-hidden">
                                    {attachment.type === 'image' ? (
                                      <img 
                                        src={attachment.url} 
                                        alt="attachment" 
                                        className="w-full h-auto object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity max-w-sm"
                                      />
                                    ) : (
                                      <a 
                                        href={attachment.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 bg-opacity-20 bg-primary/20 rounded-md hover:bg-opacity-30 transition-colors"
                                      >
                                        <Paperclip className="w-4 h-4" />
                                        <span className="text-xs truncate">{attachment.name}</span>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center justify-end gap-1 mt-2 text-xs opacity-70">
                              <span>
                                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                              </span>
                              {isOwnMessage && (
                                <CheckCheck className="w-3 h-3 ml-1" />
                              )}
                              {isUnread && !isOwnMessage && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 ml-1"></div>
                              )}
                            </div>
                          </div>
                        </div>
                        {isOwnMessage && (
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-600"
                              onClick={() => deleteMessage(msg.id)}
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src={msg.avatar} />
                              <AvatarFallback>{msg.author?.[0] || "?"}</AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-border bg-background">
            {!selectedConversation ? (
              <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                Select a conversation to start messaging
              </div>
            ) : (
              <div className="space-y-2">
                {/* Attachment Previews */}
                {(attachedImage || attachedFile) && (
                  <div className="rounded-lg border border-border bg-secondary/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Attachments</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAttachments}
                        className="h-6 px-2 text-xs"
                      >
                        Clear
                      </Button>
                    </div>
                    
                    {/* Image Preview */}
                    {attachedImage && (
                      <div className="rounded-md overflow-hidden bg-black/5 max-w-xs">
                        <img 
                          src={attachedImage} 
                          alt="preview" 
                          className="w-full h-auto object-contain max-h-48"
                        />
                        <div className="px-2 py-1 text-xs text-muted-foreground bg-secondary/50">
                          Image ready to send
                        </div>
                      </div>
                    )}
                    
                    {/* File Preview */}
                    {attachedFile && (
                      <div className="flex items-center gap-2 p-2 bg-secondary rounded-md">
                        <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{attachedFile.name}</p>
                          <p className="text-xs text-muted-foreground">File ready to send</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Input Bar */}
                <div className="flex items-center gap-2 bg-secondary rounded-lg p-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleFileAttachment}
                    title="Attach file"
                    className="h-8 w-8"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleImageAttachment}
                    title="Attach image"
                    className="h-8 w-8"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent border-0 placeholder:text-muted-foreground focus-visible:ring-0"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={!selectedConversation || isSending}
                  />
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleEmojiClick}
                    title="Add emoji"
                    disabled={isSending}
                    className="h-8 w-8"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm"
                    onClick={sendMessage}
                    disabled={(!newMessage.trim() && !attachedImage && !attachedFile) || !selectedConversation || isSending}
                    title={isSending ? "Sending..." : "Send message"}
                    className="h-8 px-3"
                  >
                    {isSending ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3 h-3 mr-1" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Character Count & Status */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                  <span>{newMessage.length} characters</span>
                  {isSending && <span className="text-blue-500">Sending…</span>}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};
export default Messages;
