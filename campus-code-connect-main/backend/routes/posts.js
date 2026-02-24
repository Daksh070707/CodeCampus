import express from "express";
import { getSupabase } from "../config/supabase.js";
import { verifyFirebaseToken } from "../middleware/firebaseAuth.js";

const router = express.Router();


// POST /api/posts
// Expects Authorization: Bearer <Firebase ID Token>
// Body: { content, title?, tags?, code? }
router.post("/", verifyFirebaseToken, async (req, res) => {
  try {
    const decoded = req.firebaseDecoded;
    const firebaseUid = req.firebaseUid;

    let supabase;
    try {
      supabase = getSupabase();
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }

    // Find profile by firebase_uid (profiles.id may be UUID)
    const { data: profiles, error: profileErr } = await supabase.from("profiles").select("id,name,college,avatar_url,role").eq("firebase_uid", firebaseUid).limit(1);
    if (profileErr) return res.status(500).json({ message: profileErr.message });

    const profile = (profiles && profiles[0]) || null;

    const { content, title, tags, code } = req.body;
    if (!content || !content.toString().trim()) return res.status(400).json({ message: "Missing content" });

    const payload = {
      user_id: profile ? profile.id : null,
      author: profile?.name || decoded.name || decoded.email || "Anonymous",
      title: title || null,
      content: content.toString(),
      college: profile?.college || null,
      code: code || null,
      tags: Array.isArray(tags) ? tags : null,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabase.from("posts").insert([payload]).select().limit(1);
    if (insertErr) return res.status(500).json({ message: insertErr.message, details: insertErr });

    return res.status(201).json({ post: (inserted && inserted[0]) || null });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/posts/:id/like  -> add a like (service role insert)
router.post('/:id/like', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const postId = req.params.id;

    let supabase;
    try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ message: e.message }); }

    // lookup profile id
    const { data: profiles, error: profileErr } = await supabase.from('profiles').select('id').eq('firebase_uid', firebaseUid).limit(1);
    if (profileErr) return res.status(500).json({ message: profileErr.message });
    const profile = (profiles && profiles[0]) || null;
    if (!profile) return res.status(400).json({ message: 'Profile not found' });

    // check existing like
    const { data: existing, error: existErr } = await supabase.from('likes').select('id').eq('post_id', postId).eq('user_id', profile.id).limit(1);
    if (existErr) return res.status(500).json({ message: existErr.message });

    if (existing && existing.length) {
      // already liked
      return res.status(200).json({ liked: true });
    }

    const { data: inserted, error: insertErr } = await supabase.from('likes').insert([{ post_id: postId, user_id: profile.id, created_at: new Date().toISOString() }]);
    if (insertErr) return res.status(500).json({ message: insertErr.message, details: insertErr });

    // increment posts.likes
    try {
      await supabase.from('posts').update({ likes: (await (async () => {
        const { data } = await supabase.from('posts').select('likes').eq('id', postId).limit(1);
        return ((data && data[0] && data[0].likes) || 0) + 1;
      })()) }).eq('id', postId);
    } catch (e) {
      // ignore post count update errors
    }

    return res.status(201).json({ liked: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// DELETE /api/posts/:id/like -> remove a like
router.delete('/:id/like', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const postId = req.params.id;

    let supabase;
    try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ message: e.message }); }

    const { data: profiles, error: profileErr } = await supabase.from('profiles').select('id').eq('firebase_uid', firebaseUid).limit(1);
    if (profileErr) return res.status(500).json({ message: profileErr.message });
    const profile = (profiles && profiles[0]) || null;
    if (!profile) return res.status(400).json({ message: 'Profile not found' });

    const { error: delErr } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', profile.id);
    if (delErr) return res.status(500).json({ message: delErr.message });

    // decrement posts.likes
    try {
      await supabase.from('posts').update({ likes: (await (async () => {
        const { data } = await supabase.from('posts').select('likes').eq('id', postId).limit(1);
        return Math.max(0, ((data && data[0] && data[0].likes) || 1) - 1);
      })()) }).eq('id', postId);
    } catch (e) {}

    return res.json({ liked: false });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/posts/:id/comments -> add a comment (service role)
router.post('/:id/comments', verifyFirebaseToken, async (req, res) => {
  try {
    const firebaseUid = req.firebaseUid;
    const postId = req.params.id;
    const { content } = req.body;
    if (!content || !content.toString().trim()) return res.status(400).json({ message: 'Missing content' });

    let supabase;
    try { supabase = getSupabase(); } catch (e) { return res.status(500).json({ message: e.message }); }

    const { data: profiles, error: profileErr } = await supabase.from('profiles').select('id,name').eq('firebase_uid', firebaseUid).limit(1);
    if (profileErr) return res.status(500).json({ message: profileErr.message });
    const profile = (profiles && profiles[0]) || null;
    if (!profile) return res.status(400).json({ message: 'Profile not found' });

    const payload = { post_id: postId, user_id: profile.id, content: content.toString(), created_at: new Date().toISOString() };
    const { data: inserted, error: insertErr } = await supabase.from('comments').insert([payload]);
    if (insertErr) return res.status(500).json({ message: insertErr.message, details: insertErr });

    // increment posts.comments
    try {
      await supabase.from('posts').update({ comments: (await (async () => {
        const { data } = await supabase.from('posts').select('comments').eq('id', postId).limit(1);
        return ((data && data[0] && data[0].comments) || 0) + 1;
      })()) }).eq('id', postId);
    } catch (e) {}

    return res.status(201).json({ comment: inserted && inserted[0] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
