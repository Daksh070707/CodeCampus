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

// Colleges list - 25+ colleges from Mumbai including Lords Universal College
const COLLEGES_MUMBAI = [
  'Lords Universal College',
  'IIT Bombay',
  'Mumbai University',
  'Veermata Jijabai Technological Institute',
  'Thadomal Shahani Engineering College',
  'St. Xavier\'s College',
  'Rizvi College of Engineering',
  'DJ Sanghvi College of Engineering',
  'K.J. Somaiya College of Engineering',
  'SVKM\'s NMIMS University',
  'Mithibai College',
  'National Institute of Industrial Engineering',
  'Bombay College of Pharmacy',
  'SNDT Women\'s University',
  'Atharva College of Engineering',
  'Fr. Conceicao Rodriguez College of Engineering',
  'Usha Mittal Institute of Technology',
  'Institute of Chemical Technology',
  'NarseeMonjee Institute of Management Studies',
  'Jaslok Institute of Physiotherapy',
  'Maharashtra Institute of Technology',
  'Ramrao Adik Institute of Technology',
  'Pillai College of Engineering',
  'Vidyalankar School of Information Technology',
  'Thakur College of Engineering and Technology',
  'Terna Engineering College',
  'Vivekanand Education Society\'s Institute of Technology',
  'Xavier Institute of Engineering',
  'Global Institute of Technology',
  'Nodal Institute of Engineering and Management Studies'
]

const DUMMY_USERS = [
  // Mumbai college students
  {
    name: 'Arjun Patel',
    email: 'arjun.patel@lords.edu',
    role: 'student',
    college: 'Lords Universal College',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun'
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@lords.edu',
    role: 'student',
    college: 'Lords Universal College',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya'
  },
  {
    name: 'Rahul Singh',
    email: 'rahul.singh@iitb.edu',
    role: 'student',
    college: 'IIT Bombay',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul'
  },
  {
    name: 'Neha Gupta',
    email: 'neha.gupta@iitb.edu',
    role: 'student',
    college: 'IIT Bombay',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neha'
  },
  {
    name: 'Zara Khan',
    email: 'zara.khan@mu.edu',
    role: 'student',
    college: 'Mumbai University',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zara'
  },
  {
    name: 'Aditya Verma',
    email: 'aditya.verma@vjti.edu',
    role: 'student',
    college: 'Veermata Jijabai Technological Institute',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aditya'
  },
  {
    name: 'Meera Kumar',
    email: 'meera.kumar@tce.edu',
    role: 'student',
    college: 'Thadomal Shahani Engineering College',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Meera'
  },
  {
    name: 'Sanjay Desai',
    email: 'sanjay.desai@xaviers.edu',
    role: 'student',
    college: 'St. Xavier\'s College',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sanjay'
  },
  {
    name: 'Kavya Singh',
    email: 'kavya.singh@rizvi.edu',
    role: 'student',
    college: 'Rizvi College of Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kavya'
  },
  {
    name: 'Rohan Mahajan',
    email: 'rohan.mahajan@djsanghvi.edu',
    role: 'student',
    college: 'DJ Sanghvi College of Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan'
  },
  {
    name: 'Anjali Chopra',
    email: 'anjali.chopra@kjsomaiya.edu',
    role: 'student',
    college: 'K.J. Somaiya College of Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali'
  },
  {
    name: 'Vikram Reddy',
    email: 'vikram.reddy@nmims.edu',
    role: 'student',
    college: 'SVKM\'s NMIMS University',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram'
  },
  {
    name: 'Disha Nair',
    email: 'disha.nair@mithibai.edu',
    role: 'student',
    college: 'Mithibai College',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Disha'
  },
  {
    name: 'Harsh Patel',
    email: 'harsh.patel@niie.edu',
    role: 'student',
    college: 'National Institute of Industrial Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Harsh'
  },
  {
    name: 'Isha Bhat',
    email: 'isha.bhat@bombay-pharmacy.edu',
    role: 'student',
    college: 'Bombay College of Pharmacy',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Isha'
  },
  {
    name: 'Nikhil Gandhi',
    email: 'nikhil.gandhi@sndt.edu',
    role: 'student',
    college: 'SNDT Women\'s University',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nikhil'
  },
  {
    name: 'Pooja Sharma',
    email: 'pooja.sharma@atharva.edu',
    role: 'student',
    college: 'Atharva College of Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pooja'
  },
  {
    name: 'Akshay Joshi',
    email: 'akshay.joshi@frcre.edu',
    role: 'student',
    college: 'Fr. Conceicao Rodriguez College of Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Akshay'
  },
  {
    name: 'Riti Malik',
    email: 'riti.malik@usit.edu',
    role: 'student',
    college: 'Usha Mittal Institute of Technology',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Riti'
  },
  {
    name: 'Aryan Kapoor',
    email: 'aryan.kapoor@ict.edu',
    role: 'student',
    college: 'Institute of Chemical Technology',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aryan'
  },
  {
    name: 'Nikita Iyer',
    email: 'nikita.iyer@nmims-nmims.edu',
    role: 'student',
    college: 'NarseeMonjee Institute of Management Studies',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nikita'
  },
  {
    name: 'Varun Bhatt',
    email: 'varun.bhatt@jaslok.edu',
    role: 'student',
    college: 'Jaslok Institute of Physiotherapy',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Varun'
  },
  {
    name: 'Shreya Menon',
    email: 'shreya.menon@mitwpu.edu',
    role: 'student',
    college: 'Maharashtra Institute of Technology',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shreya'
  },
  {
    name: 'Govind Nair',
    email: 'govind.nair@rait.edu',
    role: 'student',
    college: 'Ramrao Adik Institute of Technology',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Govind'
  },
  {
    name: 'Aisha Khan',
    email: 'aisha.khan@pillai.edu',
    role: 'student',
    college: 'Pillai College of Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aisha'
  },
  {
    name: 'Aman Sinha',
    email: 'aman.sinha@vidyalankar.edu',
    role: 'student',
    college: 'Vidyalankar School of Information Technology',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aman'
  },
  {
    name: 'Riya Patil',
    email: 'riya.patil@thakur.edu',
    role: 'student',
    college: 'Thakur College of Engineering and Technology',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Riya'
  },
  {
    name: 'Saurabh Dubey',
    email: 'saurabh.dubey@terna.edu',
    role: 'student',
    college: 'Terna Engineering College',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Saurabh'
  },
  {
    name: 'Divya Rao',
    email: 'divya.rao@vit-mumbai.edu',
    role: 'student',
    college: 'Vivekanand Education Society\'s Institute of Technology',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Divya'
  },
  {
    name: 'Harsh Kumar',
    email: 'harsh.kumar@xavier-eng.edu',
    role: 'student',
    college: 'Xavier Institute of Engineering',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HarshKumar'
  },
  {
    name: 'Megha Singh',
    email: 'megha.singh@globaltech.edu',
    role: 'student',
    college: 'Global Institute of Technology',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Megha'
  },
  {
    name: 'Karan Verma',
    email: 'karan.verma@nodal.edu',
    role: 'student',
    college: 'Nodal Institute of Engineering and Management Studies',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karan'
  },
  // Non-Mumbai students
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@stanford.edu',
    role: 'student',
    college: 'Stanford University',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
  },
  {
    name: 'Emma Wilson',
    email: 'emma.wilson@berkeley.edu',
    role: 'student',
    college: 'UC Berkeley',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'
  },
  {
    name: 'James Murphy',
    email: 'james.murphy@harvard.edu',
    role: 'student',
    college: 'Harvard University',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James'
  },
  {
    name: 'Oliver Chen',
    email: 'oliver.chen@stanford.edu',
    role: 'student',
    college: 'Stanford University',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver'
  },
  {
    name: 'Liam O\'Brien',
    email: 'liam.obrien@berkeley.edu',
    role: 'student',
    college: 'UC Berkeley',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Liam'
  },
  // Recruiters
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
    role: 'recruiter',
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
    // Create college_communities table if it doesn't exist
    console.log('📚 Ensuring college communities table exists...')
    const { error: createTableError } = await supabase.rpc('create_college_communities_table', {}, {
      head: false,
      // This won't work, let's use raw SQL instead
    })
    
    // Create college_communities table with raw SQL
    try {
      const { error: rawError } = await supabase.from('college_communities').select('id').limit(1)
      if (rawError && rawError.code === 'PGRST103') {
        // Table doesn't exist, we'll create it using the SQL
        console.log('📚 College communities table will be created via schema update')
      }
    } catch (e) {
      console.log('📚 Proceeding with college communities...')
    }

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

    // Create college communities and add students to their respective colleges
    console.log('🏫 Creating college communities and adding students...')
    const collegeStudents = {}
    
    // Group students by college
    for (const profile of profiles) {
      if (profile.role === 'student' && profile.college) {
        if (!collegeStudents[profile.college]) {
          collegeStudents[profile.college] = []
        }
        collegeStudents[profile.college].push(profile.id)
      }
    }

    let communityCount = 0
    let membershipCount = 0

    // Try to insert college communities
    try {
      for (const college of Object.keys(collegeStudents)) {
        // Check if community table exists
        const { data: existingCommunity } = await supabase
          .from('college_communities')
          .select('id')
          .eq('college_name', college)
          .single()
        
        let communityId = existingCommunity?.id
        
        if (!communityId) {
          const { data: newCommunity, error: communityError } = await supabase
            .from('college_communities')
            .insert({
              college_name: college,
              description: `Official community for ${college} students`,
              created_at: new Date().toISOString()
            })
            .select()

          if (!communityError && newCommunity && newCommunity.length > 0) {
            communityId = newCommunity[0].id
            communityCount++
          }
        }

        // Add members to community
        if (communityId) {
          const memberships = collegeStudents[college].map((studentId, idx) => ({
            community_id: communityId,
            user_id: studentId,
            role: idx === 0 ? 'admin' : 'member',
            joined_at: new Date().toISOString()
          }))

          const { error: membershipError } = await supabase
            .from('community_members')
            .insert(memberships)

          if (!membershipError) {
            membershipCount += memberships.length
          }
        }
      }
      console.log(`✅ Created ${communityCount} college communities`)
      console.log(`✅ Added ${membershipCount} students to their college communities\n`)
    } catch (e) {
      console.log('⚠️  Note: College communities table may not exist yet. Students can still use college feeds.')
      console.log('   Run this SQL in Supabase if college communities table is needed:\n')
      console.log(`CREATE TABLE IF NOT EXISTS college_communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES college_communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);\n`)
    }

    // Insert posts for each user
    console.log('📄 Inserting sample posts...')
    let postCount = 0
    for (let i = 0; i < profiles.length && i < 12; i++) {
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
      .limit(8)

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
    console.log(`   - College Communities: ${communityCount}`)
    console.log(`   - Community Members Added: ${membershipCount}`)
    console.log(`   - Posts: ${postCount}`)
    console.log(`   - Connections: ${connectionCount}`)
    console.log('\n📚 College Breakdown:')
    Object.keys(collegeStudents).forEach(college => {
      console.log(`   - ${college}: ${collegeStudents[college].length} students`)
    })
    console.log('\n✨ Your CodeCampus database is now populated with dummy data!')
  } catch (error) {
    console.error('❌ Seeding failed:', error.message)
    process.exit(1)
  }
}

seedDatabase()
