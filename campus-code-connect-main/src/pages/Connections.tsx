import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserCheck, MessageSquare, UserMinus, Clock, Mail, MapPin, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Connections = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingAllUsers, setLoadingAllUsers] = useState(false);

  useEffect(() => {
    loadConnections();
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    setLoadingAllUsers(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setLoadingAllUsers(false);
      return;
    }

    try {
      console.log(`[DISCOVER] Loading all users...`);
      const res = await fetch(`${API_BASE}/api/connections/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[DISCOVER] Loaded ${data.users?.length || 0} users`);
        setAllUsers(data.users || []);
      } else {
        const error = await res.json();
        console.error(`[DISCOVER] Error loading all users:`, error);
        setAllUsers([]);
      }
    } catch (e) {
      console.error(`[DISCOVER] Exception loading all users:`, e);
      setAllUsers([]);
    } finally {
      setLoadingAllUsers(false);
    }
  };

  const loadConnections = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Load friends
      const friendsRes = await fetch(`${API_BASE}/api/connections/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (friendsRes.ok) {
        const data = await friendsRes.json();
        setFriends(data.friends || []);
      }

      // Load requests
      const requestsRes = await fetch(`${API_BASE}/api/connections/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setReceivedRequests(data.received || []);
        setSentRequests(data.sent || []);
      }
    } catch (e) {
      console.error("Failed to load connections:", e);
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/connections/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ request_id: requestId })
      });

      if (res.ok) {
        await loadConnections();
      } else {
        const error = await res.json();
        alert(error.message || "Failed to accept request");
      }
    } catch (e) {
      console.error("Accept error:", e);
      alert("Failed to accept request");
    }
  };

  const declineRequest = async (requestId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/connections/${requestId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await loadConnections();
      } else {
        const error = await res.json();
        alert(error.message || "Failed to decline request");
      }
    } catch (e) {
      console.error("Decline error:", e);
      alert("Failed to decline request");
    }
  };

  const removeFriend = async (connectionId: string) => {
    if (!confirm("Remove friend?")) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/connections/${connectionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        await loadConnections();
      } else {
        const error = await res.json();
        alert(error.message || "Failed to remove friend");
      }
    } catch (e) {
      console.error("Remove error:", e);
      alert("Failed to remove friend");
    }
  };

  const searchUsers = async (query: string) => {
    // Clear results if query is empty
    if (query.length === 0) {
      setSearchResults([]);
      return;
    }

    // Start searching even with 1 character for real-time experience
    setSearching(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setSearching(false);
      return;
    }

    try {
      console.log(`Searching for: ${query}`);
      const res = await fetch(`${API_BASE}/api/connections/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`Search returned ${data.users?.length || 0} results`);
        setSearchResults(data.users || []);
      } else {
        const error = await res.json();
        console.error("Search failed:", error);
        setSearchResults([]);
      }
    } catch (e) {
      console.error("Search error:", e);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string, userName: string) => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please sign in");

    try {
      const res = await fetch(`${API_BASE}/api/connections/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friend_id: userId })
      });

      if (res.ok) {
        alert(`Friend request sent to ${userName}!`);
        setSearchQuery("");
        setSearchResults([]);
        await loadConnections();
        await loadAllUsers();
      } else {
        const error = await res.json();
        alert(error.message || "Failed to send friend request");
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Failed to send friend request");
    }
  };

  const handleAcceptRequestFromSearch = async (requestId: string, senderId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/connections/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ request_id: requestId })
      });

      if (res.ok) {
        await searchUsers(searchQuery);
        await loadAllUsers();
      } else {
        const error = await res.json();
        alert(error.message || "Failed to accept request");
      }
    } catch (e) {
      console.error("Accept error:", e);
      alert("Failed to accept request");
    }
  };

  const messageUser = async (userId: string, userName: string) => {
    console.log("[CONVERSATION] Starting conversation with user:", userId, userName);
    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("[CONVERSATION] No token found");
      return alert("Please sign in");
    }

    try {
      const url = `${API_BASE}/api/connections/start-conversation`;
      console.log("[CONVERSATION] POST to:", url);
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ friend_id: userId })
      });

      console.log("[CONVERSATION] Response status:", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("[CONVERSATION] Conversation created:", data);
        console.log("[CONVERSATION] Navigating to messages...");
        navigate("/dashboard/messages");
      } else {
        const error = await res.json();
        console.error("[CONVERSATION] Error response:", error);
        alert(error.message || "Failed to start conversation");
      }
    } catch (e) {
      console.error("[CONVERSATION] Error:", e);
      alert("Failed to start conversation");
    }
  };

  const filteredFriends = friends.filter(f =>
    f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.college?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const UserCard = ({ user, actionButton, secondaryButton }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback>{user.name?.split(" ").map((n: string) => n[0]).join("") || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{user.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <Mail className="w-3 h-3" />
                  {user.email}
                </p>
                {user.username && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    @{user.username}
                  </p>
                )}
                {user.college && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" />
                    {user.college}
                  </p>
                )}
                {user.role && (
                  <Badge variant="outline" className="text-xs">
                    {user.role}
                  </Badge>
                )}
                {user.friends_since && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Friends since {new Date(user.friends_since).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {actionButton}
            {secondaryButton}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Connections</h1>
              <p className="text-muted-foreground mt-1">Build your professional network</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="friends" className="relative">
              Friends
              {friends.length > 0 && (
                <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-2">
                  {friends.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="received" className="relative">
              Requests
              {receivedRequests.length > 0 && (
                <span className="ml-2 text-xs bg-destructive text-primary-foreground rounded-full px-2">
                  {receivedRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="relative">
              Pending
              {sentRequests.length > 0 && (
                <span className="ml-2 text-xs bg-yellow-600 text-primary-foreground rounded-full px-2">
                  {sentRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-4 mt-6">
            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-3">Search by name, email, or username to find people and send connection requests</p>
              <div className="relative max-w-2xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Search for people (name, email, or username)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="pl-10 h-12 text-base rounded-lg border-2 border-muted-foreground/20 focus:border-primary transition-colors"
                  autoComplete="off"
                />
              </div>
              {searchQuery && (
                <p className="text-xs text-muted-foreground mt-2">
                  Searching in names, emails, and usernames...
                </p>
              )}
            </div>

            {searching ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <Search className="w-5 h-5 text-primary" />
                  </motion.div>
                  <span className="text-muted-foreground">Searching...</span>
                </div>
              </div>
            ) : searchQuery.length === 0 ? (
              loadingAllUsers ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      <Search className="w-5 h-5 text-primary" />
                    </motion.div>
                    <span className="text-muted-foreground">Loading users...</span>
                  </div>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-16">
                  <UserPlus className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-30" />
                  <p className="text-lg font-medium text-muted-foreground">No Users Available</p>
                  <p className="text-sm text-muted-foreground mt-1">Try searching by name, email, or username to find people</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">Showing {allUsers.length} user{allUsers.length !== 1 ? 's' : ''}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allUsers.map(user => (
                      <UserCard
                        key={user.id}
                        user={user}
                        actionButton={
                          user.connection_status === "friends" ? (
                            <Button
                              className="flex-1"
                              onClick={() => messageUser(user.id, user.name)}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Message
                            </Button>
                          ) : user.connection_status === "request_sent" ? (
                            <Button
                              variant="outline"
                              disabled
                              className="flex-1"
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Pending
                            </Button>
                          ) : user.connection_status === "request_received" ? (
                            <Button
                              className="flex-1 bg-primary"
                              onClick={() => handleAcceptRequestFromSearch(user.request_id, user.id)}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                          ) : (
                            <Button
                              className="flex-1 bg-primary hover:bg-primary/90"
                              onClick={() => sendFriendRequest(user.id, user.name)}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Add Friend
                            </Button>
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              )
            ) : searchResults.length === 0 ? (
              <div className="text-center py-16">
                <UserPlus className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-30" />
                <p className="text-lg font-medium text-muted-foreground">No Results Found</p>
                <p className="text-sm text-muted-foreground mt-1">Try searching with different keywords, email, or username</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map(user => (
                    <UserCard
                      key={user.id}
                      user={user}
                      actionButton={
                        user.connection_status === "friends" ? (
                          <Button
                            className="flex-1"
                            onClick={() => messageUser(user.id, user.name)}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                        ) : user.connection_status === "request_sent" ? (
                          <Button
                            variant="outline"
                            disabled
                            className="flex-1"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Pending
                          </Button>
                        ) : user.connection_status === "request_received" ? (
                          <Button
                            className="flex-1 bg-primary"
                            onClick={() => handleAcceptRequestFromSearch(user.request_id, user.id)}
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                        ) : (
                          <Button
                            className="flex-1 bg-primary hover:bg-primary/90"
                            onClick={() => sendFriendRequest(user.id, user.name)}
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Friend
                          </Button>
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4 mt-6">
            {friends.length > 0 && (
              <div className="mb-4">
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-md"
                />
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading friends...</div>
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {friends.length === 0 ? "No friends yet. Start by sending friend requests!" : "No friends match your search"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFriends.map(friend => (
                  <UserCard
                    key={friend.id}
                    user={friend}
                    actionButton={
                      <Button
                        className="flex-1"
                        onClick={() => messageUser(friend.id, friend.name)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    }
                    secondaryButton={
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => removeFriend(friend.connection_id)}
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Received Requests Tab */}
          <TabsContent value="received" className="space-y-4 mt-6">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
            ) : receivedRequests.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">No pending requests</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {receivedRequests.map(request => (
                  <UserCard
                    key={request.request_id}
                    user={request}
                    actionButton={
                      <Button
                        className="flex-1 bg-primary"
                        onClick={() => acceptRequest(request.request_id)}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Accept
                      </Button>
                    }
                    secondaryButton={
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => declineRequest(request.request_id)}
                      >
                        Decline
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sent Requests Tab */}
          <TabsContent value="sent" className="space-y-4 mt-6">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
            ) : sentRequests.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">No pending requests sent</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sentRequests.map(request => (
                  <UserCard
                    key={request.request_id}
                    user={request}
                    actionButton={
                      <Button
                        disabled
                        variant="outline"
                        className="flex-1"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Pending
                      </Button>
                    }
                    secondaryButton={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => declineRequest(request.request_id)}
                      >
                        Cancel
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Connections;
