const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { generateRoadmap } = require('../lib/gemini');

// POST /api/roadmap/generate
// Body: { goal, level, hours_per_day, user_id }
router.post('/generate', async (req, res) => {
  const { goal, level, hours_per_day, user_id } = req.body;
  try {
    // 1. Gọi Gemini sinh lộ trình
    const aiResult = await generateRoadmap(goal, level, hours_per_day);

    // 2. Lưu roadmap vào Supabase
    const { data: roadmap, error } = await supabase
      .from('roadmaps')
      .insert({ user_id, title: aiResult.title, goal,
                total_weeks: aiResult.total_weeks, status: 'active' })
      .select().single();

    if (error) throw error;

    // 3. Lưu tất cả tasks
    const tasks = [];
    for (const week of aiResult.weeks) {
      for (const task of week.tasks) {
        tasks.push({
          roadmap_id: roadmap.id,
          week_number: week.week,
          day_label: task.day,
          topic: task.topic,
          duration_min: task.duration_min,
          resources: task.resources
        });
      }
    }
    await supabase.from('tasks').insert(tasks);

    res.json({ success: true, roadmap_id: roadmap.id, data: aiResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/roadmap/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('roadmaps')
    .select('*, tasks(*)')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Không tìm thấy' });
  res.json(data);
});

module.exports = router;