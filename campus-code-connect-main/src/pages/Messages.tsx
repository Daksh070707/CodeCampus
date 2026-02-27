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
    if (!newMessage.trim() || isSending) {
      console.log("[SEND] Skipping - either empty message or already sending");
      return;
    }
    
    const messageContent = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX
    setIsSending(true);
    
    console.log("[SEND] Sending message...", {
      conversationId: selectedConversation.id,
      contentLength: messageContent.length,
      apiBase: API_BASE
    });
    
    try {
      const url = `${API_BASE}/api/messages/conversations/${selectedConversation.id}/messages`;
      console.log("[SEND] POST to:", url);
      
      const res = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ content: messageContent }),
      });
      
      console.log("[SEND] Response status:", res.status);
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Send failed" }));
        console.error("[SEND] Error response:", error);
        throw new Error(error.message || `HTTP ${res.status}`);
      }
      
      const responseData = await res.json();
      console.log("[SEND] Message sent successfully:", responseData);
      
      // Message will be added via real-time subscription
      // No need to manually add it to the list
      
    } catch (e: any) {
      console.error("[SEND] Error:", e);
      alert(`Failed to send message: ${e.message || "Unknown error"}`);
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setIsSending(false);
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
    // Create file input for images
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        // For now, just send a message mentioning the image
        // You can enhance this to actually upload the image to storage
        setNewMessage(prev => prev + ` [Image: ${file.name}]`);
        alert('Image attachment feature coming soon! For now, the filename will be added to your message.');
      }
    };
    input.click();
  };

  const handleFileAttachment = () => {
    // Create file input for any file type
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        // For now, just send a message mentioning the file
        // You can enhance this to actually upload the file to storage
        setNewMessage(prev => prev + ` [File: ${file.name}]`);
        alert('File attachment feature coming soon! For now, the filename will be added to your message.');
      }
    };
    input.click();
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
            <div className="p-2">
              {loadingConvs ? (
                <div className="p-4 text-sm text-muted-foreground">Loading…</div>
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
                          {conv.unread_count > 99 ? '99+' : conv.unread_count}
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium truncate ${conv.unread_count > 0 ? 'font-bold' : ''}`}>
                          {conv.title || "Conversation"}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {conv.lastAt ? formatMessageTime(conv.lastAt) : ""}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                        {conv.lastMessage || "No messages yet"}
                      </p>
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
          <div className="h-16 px-4 flex items-center justify-between border-b border-border">
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
              </div>
              <div>
                <div className="font-medium">{selectedConversation?.title || "Conversation"}</div>
                <div className="text-xs text-muted-foreground">{selectedConversation ? "Active" : "Select a conversation"}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handlePhoneCall} title="Start phone call">
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleVideoCall} title="Start video call">
                <Video className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleMoreOptions} title="More options">
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
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isOwnMessage ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary rounded-bl-md"}`}>
                        {!isOwnMessage && msg.author && (
                          <p className="text-xs font-semibold mb-1 opacity-70">{msg.author}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-xs opacity-70">
                          <span>
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                          {isOwnMessage && (
                            <CheckCheck className="w-3 h-3 ml-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-border">
            {!selectedConversation ? (
              <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                Select a conversation to start messaging
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleFileAttachment}
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleImageAttachment}
                  title="Attach image"
                >
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
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleEmojiClick}
                  title="Add emoji"
                  disabled={isSending}
                >
                  <Smile className="w-4 h-4" />
                </Button>
                <Button 
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
    </DashboardLayout>
  );
};
export default Messages;
