#!/usr/bin/env node

/**
 * Seed Database Script for CodeCampus
 * This script adds dummy users, posts, connections, and messages to the Supabase database
 * Run with: node scripts/seed-db.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  console.error('   Please check your .env file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

const DUMMY_USERS = [
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@university.edu',
    role: 'student',
    college: 'Stanford University',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  },
  {
    name: 'Rahul Singh',
    email: 'rahul.singh@university.edu',
    role: 'student',
    college: 'IIT Delhi',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul'
  },
  {
    name: 'Emma Wilson',
    email: 'emma.wilson@university.edu',
    role: 'student',
    college: 'UC Berkeley',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'
  },
  {
    name: 'Arjun Patel',
    email: 'arjun.patel@university.edu',
    role: 'student',
    college: 'MIT',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun'
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@university.edu',
    role: 'student',
    college: 'IIT Bombay',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya'
  },
  {
    name: 'James Murphy',
    email: 'james.murphy@university.edu',
    role: 'student',
    college: 'Harvard University',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James'
  },
  {
    name: 'Zara Khan',
    email: 'zara.khan@university.edu',
    role: 'student',
    college: 'BITS Pilani',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zara'
  },
  {
    name: 'Oliver Chen',
    email: 'oliver.chen@university.edu',
    role: 'student',
    college: 'Stanford University',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver'
  },
  {
    name: 'Neha Gupta',
    email: 'neha.gupta@university.edu',
    role: 'student',
    college: 'Delhi University',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neha'
  },
  {
    name: 'Liam O\'Brien',
    email: 'liam.obrien@university.edu',
    role: 'student',
    college: 'UC Berkeley',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam'
  },
  {
    name: 'Sophia Johnson',
    email: 'sophia@google.com',
    role: 'recruiter',
    college: null,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia'
  },
  {
    name: 'Vikram Desai',
    email: 'vikram@microsoft.com',
    role: 'mentor',
    college: null,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram'
  }
]

const SAMPLE_POSTS = [
  {
    title: 'Just completed my React project!',
    content: 'Just finished building a full-stack e-commerce platform with React, Node.js, and PostgreSQL. Used Redux for state management and Tailwind CSS for styling. Deployed on Vercel! 🚀'
  },
  {
    title: 'Looking for internship opportunities in web dev',
    content: 'Graduating in 2024 and looking for opportunities in software development, preferably in web technologies. Open to relocating. Portfolio: github.com/example'
  },
  {
    title: 'Tips for acing technical interviews',
    content: 'Key tips from my interview preparation:\n1. Practice LeetCode consistently\n2. System design is crucial\n3. Behavioral questions matter\n4. Mock interviews helped a lot'
  },
  {
    title: 'Building an awesome full-stack application',
    content: 'Currently working on a machine learning model for image classification. Using TensorFlow and Python. If anyone wants to collaborate on open-source projects, let me know!'
  }
]

const SAMPLE_COMMENTS = [
  'Great work! This is really impressive. 👏',
  'Would love to know more about your tech stack!',
  'Let\'s collaborate on this!',
  'This is exactly what I needed!',
  'Amazing contribution to the community! 🎉'
]

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n')

  try {
    // Insert profiles
    console.log('📝 Inserting profiles...')
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .insert(
        DUMMY_USERS.map(user => ({
          name: user.name,
          email: user.email,
          role: user.role,
          college: user.college,
          avatar_url: user.avatar,
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        }))
      )
      .select()

    if (profileError) {
      console.error('❌ Error inserting profiles:', profileError.message)
      return
    }

    console.log(`✅ Created ${profiles.length} profiles\n`)

    // Insert posts for each user
    console.log('📄 Inserting sample posts...')
    let postCount = 0
    for (let i = 0; i < profiles.length && i < 8; i++) {
      const profile = profiles[i]
      const post = SAMPLE_POSTS[i % SAMPLE_POSTS.length]

      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: profile.id,
          author: profile.name,
          title: post.title,
          content: post.content,
          college: profile.college,
          role: profile.role,
          avatar_url: profile.avatar_url,
          tags: ['react', 'nodejs', 'web-development', 'fullstack'],
          created_at: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString()
        })

      if (!postError) postCount++
    }
    console.log(`✅ Created ${postCount} posts\n`)

    // Fetch posts to add likes and comments
    console.log('👍 Adding likes and comments to posts...')
    const { data: posts } = await supabase
      .from('posts')
      .select('id, user_id')
      .limit(5)

    if (posts && posts.length > 0) {
      let likeCount = 0
      let commentCount = 0

      for (const post of posts) {
        // Add likes from random users
        for (let i = 0; i < 3; i++) {
          const randomUser = profiles[Math.floor(Math.random() * profiles.length)]
          if (randomUser.id !== post.user_id) {
            const { error: likeError } = await supabase
              .from('likes')
              .insert({
                post_id: post.id,
                user_id: randomUser.id
              })

            if (!likeError) likeCount++
          }
        }

        // Add comments from random users
        for (let i = 0; i < 2; i++) {
          const randomUser = profiles[Math.floor(Math.random() * profiles.length)]
          if (randomUser.id !== post.user_id) {
            const { error: commentError } = await supabase
              .from('comments')
              .insert({
                post_id: post.id,
                user_id: randomUser.id,
                content: SAMPLE_COMMENTS[Math.floor(Math.random() * SAMPLE_COMMENTS.length)]
              })

            if (!commentError) commentCount++
          }
        }
      }
      console.log(`✅ Added ${likeCount} likes and ${commentCount} comments\n`)
    }

    // Create sample connections
    console.log('🤝 Creating sample connections...')
    let connectionCount = 0
    for (let i = 0; i < profiles.length - 1; i++) {
      for (let j = i + 1; j < profiles.length && j < i + 3; j++) {
        const { error: connError } = await supabase
          .from('connections')
          .insert({
            user_id: profiles[i].id,
            friend_id: profiles[j].id,
            status: Math.random() > 0.3 ? 'accepted' : 'pending'
          })

        if (!connError) connectionCount++
      }
    }
    console.log(`✅ Created ${connectionCount} connections\n`)

    console.log('🎉 Database seeding completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`   - Profiles: ${profiles.length}`)
    console.log(`   - Posts: ${postCount}`)
    console.log(`   - Connections: ${connectionCount}`)
    console.log('\n✨ Your CodeCampus database is now populated with dummy data!')
  } catch (error) {
    console.error('❌ Seeding failed:', error.message)
    process.exit(1)
  }
}

seedDatabase()
