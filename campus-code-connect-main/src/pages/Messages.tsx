import { useState, useEffect } from "react";
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

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Messages = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shareId = params.get("sharePostId");
    if (shareId) {
      const url = `${window.location.origin}/dashboard/feed#post-${shareId}`;
      setNewMessage(`Check out this post: ${url}`);
    }
  }, [location.search]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoadingConvs(true);
    const token = localStorage.getItem("token");
    if (!token) return setLoadingConvs(false);
    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations`, { headers: { Authorization: `Bearer ${token}` } });
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
    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations/${conv.id}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to load messages");
      const body = await res.json();
      setMessagesList(body.messages || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation) return;
    const token = localStorage.getItem("token");
    if (!token) return alert("Sign in to send messages");
    if (!newMessage.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (!res.ok) throw new Error("Send failed");
      const body = await res.json();
      setMessagesList((m) => [...m, body.message]);
      setNewMessage("");
      // refresh conversations list to update last message
      loadConversations();
    } catch (e) {
      console.warn(e);
      alert("Failed to send message");
    }
  };

  const onSelectConv = async (conv: any) => {
    setSelectedConversation(conv);
    await loadMessages(conv);
    setShowMobileChat(true);
  };

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
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">{conv.title || "Conversation"}</span>
                        <span className="text-xs text-muted-foreground">{conv.lastAt ? new Date(conv.lastAt).toLocaleString() : ""}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
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
              <Button variant="ghost" size="icon">
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {loadingMessages ? (
                <div className="text-sm text-muted-foreground">Loading messages…</div>
              ) : (
                (messagesList || []).map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_id === null ? "justify-start" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_id ? "bg-secondary rounded-bl-md" : "bg-primary text-primary-foreground rounded-br-md"}`}>
                      <p className="text-sm">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-xs text-muted-foreground">
                        <span>{msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                className="flex-1"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
              />
              <Button variant="ghost" size="icon">
                <Smile className="w-4 h-4" />
              </Button>
              <Button size="icon" onClick={sendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};
export default Messages;
