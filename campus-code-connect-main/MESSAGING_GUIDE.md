# Messaging System - Complete Guide & Testing

## Overview
The messaging system allows users to send real-time messages to their connections. It uses Supabase real-time channels for live updates and supports both student and recruiter messaging.

## Architecture

### Frontend Components
- **`src/pages/Messages.tsx`**: Student messaging interface
- **`src/pages/recruiter/RecruiterMessages.tsx`**: Recruiter messaging interface with interview scheduling

### Backend Routes
- **API Base**: `http://localhost:5000` (or `VITE_API_URL`)

#### Authentication
All endpoints require `Authorization: Bearer {token}` header with JWT token from `/api/auth/profile`

#### Endpoints

1. **GET `/api/messages/conversations`**
   - Lists all conversations for the current user
   - Returns: Array of conversations with last message, timestamp, unread count
   - Example response:
   ```json
   {
     "conversations": [
       {
         "id": "conv-uuid",
         "title": "John Doe & Jane Smith",
         "is_group": false,
         "lastMessage": "Hi there!",
         "lastAt": "2024-01-15T10:30:00Z",
         "unread_count": 2
       }
     ]
   }
   ```

2. **POST `/api/messages/conversations`**
   - Creates a new conversation
   - Request: `{ title?: string, participantIds: string[] }`
   - Returns: Created conversation object

3. **GET `/api/messages/conversations/:id/messages`**
   - Fetches all messages in a conversation
   - Returns: Array of messages with sender info (name, avatar)
   - Example response:
   ```json
   {
     "messages": [
       {
         "id": "msg-uuid",
         "content": "Hello!",
         "sender_id": "user-uuid",
         "author": "John Doe",
         "avatar": "https://...",
         "created_at": "2024-01-15T10:30:00Z"
       }
     ]
   }
   ```

4. **POST `/api/messages/conversations/:id/messages`**
   - Sends a message in a conversation
   - Request: `{ content: string }`
   - Returns: Created message object
   - Status: 201 on success, 400/500 on error

### Database Schema
- **`conversations`**: id, title, is_group, created_at, last_message_at
- **`messages`**: id, conversation_id, sender_id, content, created_at
- **`participants`**: id, conversation_id, user_id
- **`profiles`**: id, firebase_uid, name, email, username, role, college, avatar_url

### Real-time Subscriptions
- Supabase PostgreSQL Changes channel
- Listens for INSERT events on `messages` table
- Automatically adds new messages to the UI when received
- Auto-scrolls to latest message

## User Flow

### 1. Starting a Conversation (from Connections)
**Button**: Message button on UserCard
**Flow**:
1. User clicks "Message" on a connection
2. POST `/api/connections/start-conversation` with `{ friend_id }`
3. Backend creates conversation and adds both users as participants
4. Frontend navigates to `/dashboard/messages`
5. Conversation appears in list with other chats

**Console Logs to Watch**:
```
[CONVERSATION] Starting conversation with user: user-uuid John Doe
[CONVERSATION] POST to: http://localhost:5000/api/connections/start-conversation
[CONVERSATION] Response status: 201
[CONVERSATION] Conversation created: { conversation: {...} }
[CONVERSATION] Navigating to messages...
```

### 2. Loading Conversations
**Flow**:
1. User navigates to Messages page
2. Component mounts, calls `loadConversations()`
3. Fetches list of user's conversations from backend
4. Displays conversations in left sidebar
5. Subscribes to real-time updates

**Console Logs to Watch**:
```
Message component mounted, loading conversations...
[AUTH] Fetching current user profile...
[AUTH] Profile response status: 200
[AUTH] Current user ID: user-uuid
[CONVERSATIONS] Starting to load conversations...
[CONVERSATIONS] Fetching from: http://localhost:5000/api/messages/conversations
[CONVERSATIONS] Response status: 200
[CONVERSATIONS] Loaded successfully, count: 3
[CONVERSATIONS] Data: [...]
```

### 3. Opening a Conversation
**Action**: Click on conversation in left sidebar
**Flow**:
1. Called `onSelectConv(conversation)`
2. Fetches messages for conversation
3. Sets up real-time subscription for new messages
4. Marks conversation as read

**Console Logs to Watch**:
```
[MESSAGES] Loading messages for conversation: conv-uuid "John & Jane"
[MESSAGES] Fetching from: http://localhost:5000/api/messages/conversations/conv-uuid/messages
[MESSAGES] Response status: 200
[MESSAGES] Loaded successfully, count: 15
[MESSAGES] Subscribing to real-time updates for conversation: conv-uuid
[READ] Marking conversation as read: conv-uuid
[READ] Successfully marked as read
```

### 4. Sending a Message
**Action**: Type message and press Enter or click Send button
**Flow**:
1. User types message and submits
2. Input is cleared immediately (optimistic UX)
3. POST to `/api/messages/conversations/:id/messages`
4. Backend inserts message into database
5. Real-time subscription triggers and adds message to UI
6. Message appears with sender info and timestamp

**Console Logs to Watch**:
```
[SEND] Sending message...
  {
    conversationId: "conv-uuid",
    contentLength: 25,
    apiBase: "http://localhost:5000"
  }
[SEND] POST to: http://localhost:5000/api/messages/conversations/conv-uuid/messages
[SEND] Response status: 201
[SEND] Message sent successfully: { message: {...} }
[MESSAGES] Real-time message received: { id: "msg-uuid", content: "...", sender_id: "..." }
[MESSAGES] Adding new message to list
```

### 5. Receiving a Message (Real-time)
**Flow**:
1. Another user sends a message
2. Real-time subscription detects INSERT on messages table
3. Fetches sender profile info
4. Adds enriched message to state
5. UI updates automatically
6. Auto-scrolls to new message

**Console Logs to Watch**:
```
[MESSAGES] Real-time message received: { id: "msg-uuid", content: "...", sender_id: "..." }
[MESSAGES] Adding new message to list
```

### 6. Conversation Actions (Recruiter)
**Buttons**: Phone, Video, More Options (in header)
**Phone/Video**: Schedules interview draft (recruiter only)
**More Options**: For future features (clear, mute, delete, block)

**Console Logs to Watch**:
```
[CALL] Initiating phone call with: conversation title
Alert: "Phone call feature coming soon! (Integration with WebRTC or Jitsi Meet)"
```

## Testing Checklist

### ✅ Setup Testing
- [ ] Ensure `VITE_API_URL` is set to your backend URL
- [ ] Ensure you're logged in (token in localStorage)
- [ ] Open browser DevTools Console (F12)

### ✅ Conversation Creation
- [ ] Go to Connections tab
- [ ] Find a connection/friend
- [ ] Click "Message" button
- [ ] Verify navigation to Messages page
- [ ] Verify console shows `[CONVERSATION]` logs
- [ ] Confirm conversation appears in list

### ✅ Conversation Loading
- [ ] Load Messages page
- [ ] Verify all your conversations load in left sidebar
- [ ] Verify console shows `[CONVERSATIONS]` logs with count
- [ ] Check unread counts display if applicable

### ✅ Message Loading
- [ ] Click on a conversation
- [ ] Verify messages load in the main area
- [ ] Verify console shows `[MESSAGES]` logs
- [ ] Verify sender info displays (avatar, name)
- [ ] Verify timestamps display correctly

### ✅ Sending Messages
- [ ] Type a message in the input field
- [ ] Press Enter or click Send
- [ ] Verify input clears immediately
- [ ] Watch console for `[SEND]` logs
- [ ] Verify message appears in chat (blue on right for own messages)
- [ ] Verify CheckCheck icon appears (double tick = sent)

### ✅ Real-time Updates
- [ ] Open conversation in two browser tabs
- [ ] Send message from tab 1
- [ ] Verify it appears in tab 2 automatically
- [ ] Watch console for `[MESSAGES] Real-time message received`
- [ ] Verify sender info is correct in tab 2

### ✅ Attachments
- [ ] Click Paperclip icon (file attachment)
- [ ] Select a file
- [ ] Verify filename appears in message text
- [ ] Send message and verify it's sent

- [ ] Click Image icon (image attachment)
- [ ] Select an image
- [ ] Verify filename appears in message text
- [ ] Send message and verify it's sent

### ✅ Emoji Support
- [ ] Click Smile icon (emoji)
- [ ] Verify emoji is added to message
- [ ] Send message with emoji

### ✅ Recruit Features (Recruiter only)
- [ ] Click Phone icon
- [ ] Verify alert shows (feature coming soon)
- [ ] Click Video icon
- [ ] Verify alert shows (feature coming soon)
- [ ] Click More Options icon
- [ ] Verify alert shows (feature coming soon)

### ✅ Error Handling
- [ ] Disconnect from internet
- [ ] Try to send a message
- [ ] Verify error alert appears
- [ ] Verify message is restored in input
- [ ] Reconnect internet

- [ ] Delete token from localStorage
- [ ] Try to operate on Messages page
- [ ] Verify redirected or prompted to sign in

## Troubleshooting

### Messages not loading?
1. Check console for `[MESSAGES]` logs
2. Verify response status is 200
3. Verify API_BASE URL is correct
4. Confirm token is in localStorage
5. Check backend logs for errors

### Real-time messages not appearing?
1. Check if subscription logs appear in console
2. Verify Supabase connection is active
3. Confirm message was inserted in database
4. Check for duplicate message prevention logs

### Can't start conversation?
1. Check `[CONVERSATION]` logs in console
2. Verify HTTP status 201
3. Confirm both users exist in profiles table
4. Check backend for profile lookup errors

### Sending fails?
1. Check `[SEND]` logs in console
2. Verify token is valid
3. Confirm conversation exists
4. Check message content is not empty
5. Verify content-type header is correct

## Console Log Reference

### Log Prefixes Used
- `[AUTH]` - Authentication/current user
- `[CONVERSATIONS]` - Loading conversation list
- `[MESSAGES]` - Loading/receiving messages
- `[SEND]` - Sending messages
- `[READ]` - Marking as read
- `[CALL]` - Phone/video call features
- `[MENU]` - Menu options
- `[CONVERSATION]` - Creating conversation

### Example Full Flow Console Output
```
Message component mounted, loading conversations...
[AUTH] Fetching current user profile...
[AUTH] Profile response status: 200
[AUTH] Current user ID: abc123...
[CONVERSATIONS] Starting to load conversations...
[CONVERSATIONS] Fetching from: http://localhost:5000/api/messages/conversations
[CONVERSATIONS] Response status: 200
[CONVERSATIONS] Loaded successfully, count: 2
[CONVERSATIONS] Data: [{"id":"conv1",...}]

[User clicks on conversation]

[MESSAGES] Loading messages for conversation: conv1 "John & Jane"
[MESSAGES] Fetching from: http://localhost:5000/api/messages/conversations/conv1/messages
[MESSAGES] Response status: 200
[MESSAGES] Loaded successfully, count: 5
[MESSAGES] Subscribing to real-time updates for conversation: conv1
[READ] Marking conversation as read: conv1
[READ] Successfully marked as read

[User types and sends message]

[SEND] Sending message...
[SEND] POST to: http://localhost:5000/api/messages/conversations/conv1/messages
[SEND] Response status: 201
[SEND] Message sent successfully: {"message":{...}}
[MESSAGES] Real-time message received: {"id":"msg1",...}
[MESSAGES] Adding new message to list
```

## Features Summary

### ✅ Implemented & Working
- Send/receive messages in real-time
- View list of conversations
- Create new conversations from Connections
- Auto-load messages when opening conversation
- Display sender info (name, avatar)
- Mark conversations as read
- File attachments (filename in message)
- Image attachments (filename in message)
- Emoji picker
- Keyboard support (Enter to send)
- Mobile responsive
- Message timestamps (Today, Yesterday, dates)
- Read receipts (double tick for sent messages)
- Unread count in conversation list

### 🔄 In Progress
- Call/video call integration
- Advanced menu options (mute, clear, delete, block)

### 📋 Not Yet Implemented
- File/image upload to storage (currently just filename)
- Message editing
- Message deletion
- Typing indicators
- Groups conversations UI
- Search within messages
- Pin important messages

## Quick Reference

**Start messaging**: Connections page → Select contact → Click "Message"
**Send message**: Type text → Press Enter or click Send
**Real-time check**: Open in two tabs → Send from one → Should appear in other
**View logs**: DevTools Console (F12) → Search for `[SEND]`, `[MESSAGES]`, etc.
**API Testing**: Use Postman with Bearer token from localStorage

## Environment Variables

```env
VITE_API_URL=http://localhost:5000  # Backend API endpoint
```

If not set, defaults to `http://localhost:5000`
