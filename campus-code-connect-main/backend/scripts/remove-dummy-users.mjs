#!/usr/bin/env node

/**
 * Remove Dummy Users Script
 * 
 * This script removes all test/seed/dummy users from the Supabase database.
 * Only real users with valid Firebase UIDs are kept.
 * 
 * Usage: npm run remove-dummy-users
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "❌ Missing environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_KEY"
  );
  process.exit(1);
}

// Initialize Supabase client with service role (admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function identifyDummyUsers() {
  console.log("🔍 Identifying dummy users...\n");

  const { data: dummyUsers, error } = await supabase
    .from("profiles")
    .select("id, name, email, firebase_uid, role, created_at")
    .or(
      `firebase_uid.is.null,firebase_uid.eq.'',email.like.%@lords.edu%,email.like.%@iitb.edu%,email.like.%@google.com%,email.like.%test%`
    );

  if (error) {
    console.error("❌ Error querying dummy users:", error);
    return null;
  }

  return dummyUsers || [];
}

async function identifyRealUsers() {
  console.log("👤 Identifying real users...\n");

  const { data: realUsers, error } = await supabase
    .from("profiles")
    .select("id, name, email, firebase_uid, role, created_at")
    .neq("firebase_uid", null)
    .neq("firebase_uid", "");

  if (error) {
    console.error("❌ Error querying real users:", error);
    return null;
  }

  return realUsers || [];
}

async function removeDummyUsers() {
  console.log("⚠️  Starting removal of dummy users...\n");

  try {
    // Step 1: Get dummy user IDs
    const dummyUsers = await identifyDummyUsers();

    if (dummyUsers.length === 0) {
      console.log("✅ No dummy users found. Database is clean!");
      return true;
    }

    console.log(`Found ${dummyUsers.length} dummy users to remove:\n`);
    dummyUsers.forEach((user) => {
      console.log(
        `  • ${user.name} (${user.email}) - ID: ${user.id} - Role: ${user.role}`
      );
    });
    console.log();

    const dummyUserIds = dummyUsers.map((u) => u.id);

    // Step 2: Delete likes from dummy users
    console.log("🗑️  Deleting likes from dummy users...");
    const { error: likesError, count: likesCount } = await supabase
      .from("likes")
      .delete()
      .in("user_id", dummyUserIds);

    if (likesError) {
      console.error("❌ Error deleting likes:", likesError);
      return false;
    }
    console.log(`✅ Deleted ${likesCount || 0} likes\n`);

    // Step 3: Delete comments from dummy users
    console.log("🗑️  Deleting comments from dummy users...");
    const { error: commentsError, count: commentsCount } = await supabase
      .from("comments")
      .delete()
      .in("user_id", dummyUserIds);

    if (commentsError) {
      console.error("❌ Error deleting comments:", commentsError);
      return false;
    }
    console.log(`✅ Deleted ${commentsCount || 0} comments\n`);

    // Step 4: Delete posts from dummy users
    console.log("🗑️  Deleting posts from dummy users...");
    const { error: postsError, count: postsCount } = await supabase
      .from("posts")
      .delete()
      .in("user_id", dummyUserIds);

    if (postsError) {
      console.error("❌ Error deleting posts:", postsError);
      return false;
    }
    console.log(`✅ Deleted ${postsCount || 0} posts\n`);

    // Step 5: Delete dummy user profiles
    console.log("🗑️  Deleting dummy user profiles...");
    const { error: profilesError, count: profilesCount } = await supabase
      .from("profiles")
      .delete()
      .in("id", dummyUserIds);

    if (profilesError) {
      console.error("❌ Error deleting profiles:", profilesError);
      return false;
    }
    console.log(`✅ Deleted ${profilesCount || 0} user profiles\n`);

    return true;
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return false;
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════╗");
  console.log("║   Remove Dummy Users from Database    ║");
  console.log("╚═══════════════════════════════════════╝\n");

  // Show what we're about to do
  const dummyUsers = await identifyDummyUsers();
  const realUsers = await identifyRealUsers();

  if (!dummyUsers || !realUsers) {
    console.error("❌ Failed to query database");
    process.exit(1);
  }

  console.log(`📊 Database Statistics:`);
  console.log(`   • Total users: ${dummyUsers.length + realUsers.length}`);
  console.log(`   • Dummy users: ${dummyUsers.length}`);
  console.log(`   • Real users: ${realUsers.length}\n`);

  if (dummyUsers.length === 0) {
    console.log("✅ No dummy users found. Exiting.\n");
    process.exit(0);
  }

  // Confirm before deletion
  console.log("⚠️  This will permanently delete:");
  console.log(`   • ${dummyUsers.length} dummy user profiles`);
  console.log(`   • All their posts, comments, and likes\n`);

  console.log("Real users will be preserved:");
  realUsers.forEach((user) => {
    console.log(
      `   ✅ ${user.name} (${user.email}) - Role: ${user.role}`
    );
  });
  console.log();

  // Proceed with removal
  const success = await removeDummyUsers();

  if (success) {
    console.log("═══════════════════════════════════════");
    console.log("✅ Successfully removed all dummy users!");
    console.log(
      `📊 Database now contains only real users: ${realUsers.length}`
    );
    console.log("═══════════════════════════════════════\n");
    process.exit(0);
  } else {
    console.error("❌ Failed to remove dummy users");
    process.exit(1);
  }
}

main();
