const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../lib/supabase');
const { generateRoadmap } = require('../lib/gemini');

// Helper: Tạo Supabase client mang JWT token của user
function getUserClient(req) {
  const accessToken = req.session?.user?.access_token;
  if (!accessToken) return supabase;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY ||
              process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// POST /api/roadmap/generate
router.post('/generate', async (req, res) => {
  const { goal, level, hours_per_day } = req.body;
  const user_id = req.session?.user?.id;
  const email = req.session?.user?.email;
  const db = getUserClient(req);

  if (!user_id) return res.status(401).json({ success: false, error: 'Bạn cần đăng nhập trước.' });
  if (!goal || !level || !hours_per_day) {
    return res.status(400).json({ success: false, error: 'Thiếu thông tin đầu vào.' });
  }

  try {
    // Đảm bảo profile tồn tại (dùng upsert với user client)
    await db.from('profiles').upsert({
      id: user_id,
      full_name: email?.split('@')[0] || 'User',
    }, { onConflict: 'id', ignoreDuplicates: true });

    // Tạo lộ trình
    const aiResult = await generateRoadmap(goal, level, hours_per_day);

    // Lưu roadmap
    const { data: roadmap, error: roadmapError } = await db
      .from('roadmaps')
      .insert({
        user_id,
        title: aiResult.title,
        goal,
        total_weeks: aiResult.total_weeks,
        status: 'active',
      })
      .select()
      .single();

    if (roadmapError) throw roadmapError;

    // Lưu tasks
    const tasksToInsert = [];
    for (const week of aiResult.weeks) {
      for (const task of week.tasks) {
        tasksToInsert.push({
          roadmap_id: roadmap.id,
          week_number: week.week,
          week_theme: week.theme,
          day_label: task.day,
          topic: task.topic,
          duration_min: task.duration_min,
          description: task.description || '',
          resources: task.resources || [],
          is_completed: false,
        });
      }
    }

    if (tasksToInsert.length > 0) {
      const { error: taskError } = await db.from('tasks').insert(tasksToInsert);
      if (taskError) throw taskError;
    }

    // Cập nhật profile
    await db.from('profiles').upsert({
      id: user_id,
      goal,
      level,
      hours_per_day: parseInt(hours_per_day),
    });

    res.json({
      success: true,
      roadmap_id: roadmap.id,
      title: aiResult.title,
      total_weeks: aiResult.total_weeks,
      total_tasks: tasksToInsert.length,
    });

  } catch (err) {
    console.error('Generate roadmap error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/roadmap/:id
router.get('/:id', async (req, res) => {
  const db = getUserClient(req);

  try {
    const { data: roadmap, error } = await db
      .from('roadmaps')
      .select('*, tasks(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !roadmap) {
      return res.status(404).json({ error: 'Không tìm thấy lộ trình.' });
    }
    res.json(roadmap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/roadmap/user/:user_id
router.get('/user/:user_id', async (req, res) => {
  const db = getUserClient(req);

  try {
    const { data, error } = await db
      .from('roadmaps')
      .select('*')
      .eq('user_id', req.params.user_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
