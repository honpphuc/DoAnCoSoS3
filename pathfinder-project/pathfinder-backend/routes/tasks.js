const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// PATCH /api/tasks/:id/complete
// Tick hoàn thành hoặc bỏ tick — gọi từ dashboard và lesson
router.patch('/:id/complete', async (req, res) => {
  const { is_completed } = req.body;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        is_completed,
        completed_at: is_completed ? new Date().toISOString() : null,
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, task: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tasks/today/:roadmap_id
// Lấy tasks của hôm nay dựa trên day_label khớp với thứ hiện tại
router.get('/today/:roadmap_id', async (req, res) => {
  // Map JS getDay() → day_label trong DB
  const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayLabel = dayMap[new Date().getDay()];

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('roadmap_id', req.params.roadmap_id)
      .eq('day_label', todayLabel)
      .order('week_number', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/week/:roadmap_id/:week_number
// Lấy tasks theo tuần — dùng cho schedule và roadmap view
router.get('/week/:roadmap_id/:week_number', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('roadmap_id', req.params.roadmap_id)
      .eq('week_number', parseInt(req.params.week_number))
      .order('day_label', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/all/:roadmap_id
// Lấy toàn bộ tasks — dùng tính % tiến độ
router.get('/all/:roadmap_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, topic, day_label, week_number, week_theme, is_completed, duration_min')
      .eq('roadmap_id', req.params.roadmap_id)
      .order('week_number', { ascending: true });

    if (error) throw error;

    const total = data.length;
    const done = data.filter(t => t.is_completed).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    res.json({ tasks: data, total, done, percent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
