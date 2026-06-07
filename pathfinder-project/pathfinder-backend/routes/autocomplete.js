const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

// POST /api/auto-complete
// Gọi mỗi khi user vào dashboard — tự động tick những task đã qua ngày học
router.post('/run/:roadmap_id', async (req, res) => {
  const { roadmap_id } = req.params;

  try {
    const { data: roadmap } = await supabase
      .from('roadmaps')
      .select('created_at, total_weeks')
      .eq('id', roadmap_id)
      .single();

    if (!roadmap) return res.status(404).json({ error: 'Không tìm thấy roadmap' });

    const createdAt = new Date(roadmap.created_at);
    const now = new Date();

    // Tính ngày bắt đầu của từng task dựa trên week_number và day_label
    const dayOffset = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, week_number, day_label, is_completed')
      .eq('roadmap_id', roadmap_id)
      .eq('is_completed', false); // Chỉ xét task chưa hoàn thành

      if (!tasks || tasks.length === 0) {
      return res.json({ success: true, auto_completed: 0 });
    }

    const toComplete = [];

    for (const task of tasks) {
      // Tính ngày task được lên lịch
      const weekStartOffset = (task.week_number - 1) * 7;
      const dayOff = dayOffset[task.day_label] ?? 0;
      const taskDate = new Date(createdAt);
      taskDate.setDate(taskDate.getDate() + weekStartOffset + dayOff);
      taskDate.setHours(23, 59, 59, 0); // Hết ngày đó

      // Nếu ngày học đã qua → auto tick hoàn thành
      if (now > taskDate) {
        toComplete.push(task.id);
      }
    }

    if (toComplete.length > 0) {
      await supabase
        .from('tasks')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .in('id', toComplete);
    }

    res.json({ success: true, auto_completed: toComplete.length });

  } catch (err) {
    console.error('Auto-complete error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
