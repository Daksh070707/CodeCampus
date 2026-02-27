# 🌱 CodeCampus Database Seeding Guide

This guide explains how to add dummy users, posts, connections, and messages to your CodeCampus database for testing and development.

## 📋 What Gets Seeded

The seed scripts will add:
- **12 dummy user profiles** (10 students from different colleges, 2 recruiters/mentors)
- **Sample posts** with realistic content about projects, internships, and tips
- **Likes & Comments** on posts from various users
- **Connections/Friendships** between users
- **Sample messages** in conversations
- **Avatar URLs** using Dicebear API for profile pictures

## 🚀 Methods to Seed Data

### Method 1: Using the Node.js Script (Recommended)

**Easiest way - recommended for development**

```bash
# From the backend directory
cd backend

# Install dependencies if not already done
npm install

# Run the seed script
npm run seed
```

This will:
✅ Connect to your Supabase database using the service role key
✅ Create all dummy users
✅ Add sample posts
✅ Create likes and comments
✅ Establish connections between users
✅ Display a summary of what was created

### Method 2: Manual SQL in Supabase

**If you prefer to manually run SQL**

1. Go to your Supabase project: [https://app.supabase.com](https://app.supabase.com)
2. Navigate to SQL Editor
3. Click "New Query"
4. Copy the contents of `backend/supabase/seed-data.sql`
5. Paste it into the SQL editor
6. Click "Run"

## ⚙️ Configuration

The Node.js seed script uses these environment variables from your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Make sure these are set in your backend `.env` file before running the seed script.

## 👥 Sample Users Created

| Name | Email | Role | College |
|------|-------|------|---------|
| Sarah Chen | sarah.chen@university.edu | Student | Stanford University |
| Rahul Singh | rahul.singh@university.edu | Student | IIT Delhi |
| Emma Wilson | emma.wilson@university.edu | Student | UC Berkeley |
| Arjun Patel | arjun.patel@university.edu | Student | MIT |
| Priya Sharma | priya.sharma@university.edu | Student | IIT Bombay |
| James Murphy | james.murphy@university.edu | Student | Harvard University |
| Zara Khan | zara.khan@university.edu | Student | BITS Pilani |
| Oliver Chen | oliver.chen@university.edu | Student | Stanford University |
| Neha Gupta | neha.gupta@university.edu | Student | Delhi University |
| Liam O'Brien | liam.obrien@university.edu | Student | UC Berkeley |
| Sophia Johnson | sophia@google.com | Recruiter | Google |
| Vikram Desai | vikram@microsoft.com | Mentor | Microsoft |

## 🧪 Testing the Seeded Data

After seeding, you can test with:

### 1. **Discover Page**
- Navigate to `/dashboard/discover`
- All the seeded users will appear in search results
- Try adding friends from the discover page

### 2. **Feed Page**
- Navigate to `/dashboard/feed`
- You'll see posts from all the seeded users
- Like and comment on posts

### 3. **Connections Page**
- Navigate to `/dashboard/connections`
- View all the existing friend connections

### 4. **Messages Page**
- Navigate to `/dashboard/messages`
- You'll see sample conversations and messages

## 🔄 Reseeding (Clearing and Starting Fresh)

If you want to clear the dummy data and start fresh:

### Option 1: Delete via SQL (Keep structure)
```sql
-- Run in Supabase SQL Editor to delete only dummy data
SET session_replication_role = 'replica';
DELETE FROM messages;
DELETE FROM participants;
DELETE FROM conversations;
DELETE FROM comments;
DELETE FROM likes;
DELETE FROM posts;
DELETE FROM connections;
DELETE FROM profiles WHERE email LIKE '%@university.edu' OR email LIKE '%@google.com' OR email LIKE '%@microsoft.com';
SET session_replication_role = 'default';
```

Then run the seed script again.

### Option 2: Reset entire database
1. Go to Supabase dashboard
2. Project Settings → Database
3. Click "Reset database" (WARNING: This deletes everything)
4. Run the schema script: `npm run apply:schema`
5. Run the seed script: `npm run seed`

## 📝 Customizing Seed Data

You can modify the seed data by editing:

- **Node.js version**: Edit `backend/scripts/seed-db.js`
  - Modify `DUMMY_USERS` array to add/remove users
  - Modify `SAMPLE_POSTS` array to change post content
  - Modify `SAMPLE_COMMENTS` array to change comments

- **SQL version**: Edit `backend/supabase/seed-data.sql`
  - Modify the INSERT statements

## 🐛 Troubleshooting

### Error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
- Make sure your `.env` file has these variables set
- The file should be in the `backend` directory

### Error: "Unable to connect to database"
- Verify your Supabase credentials are correct
- Check your internet connection
- Ensure the Supabase project is running

### Some data didn't seed
- Check for constraint violations or duplicate emails
- Run the reset command to clear and try again

### Need more users?
- Edit the `DUMMY_USERS` array in `seed-db.js` and add more profiles
- The script will handle all relationships automatically

## 📚 Related Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [Database Schema](./schema.sql)
- [Friends System](./friends-schema.sql)

## 💡 Tips

- ✅ Run the seed script regularly during development for fresh test data
- ✅ Use different email domains to organize different types of users
- ✅ Modify the script to match your user onboarding process
- ✅ Keep a backup of your `.env` file when testing
- ⚠️ Never use these credentials in production!

---

Happy testing! 🚀
