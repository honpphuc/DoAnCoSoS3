const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { GOAL_TAG_MAP, findTagFromTopic, suggestResources } = require('../lib/gemini');

// POST /api/resources/suggest
// Body: { topic, level, goal }
router.post('/suggest', async (req, res) => {
  const { topic, level, goal } = req.body;

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Thiếu topic.' });
  }

  try {
    const resources = await suggestResources(topic, level || 'beginner', goal || '');
    res.json({ success: true, data: resources });
  } catch (err) {
    console.error('Suggest resources error:', err);
    res.status(500).json({ success: false, error: err.message, data: [] });
  }
});

// GET /api/resources/goal/:goal
router.get('/goal/:goal', async (req, res) => {
  const goalData = GOAL_TAG_MAP[req.params.goal];
  if (!goalData) {
    return res.status(400).json({ success: false, error: 'Goal không hợp lệ.' });
  }
  try {
    const { data } = await supabase.from('resources').select('*').in('tag', goalData.tags).order('tag');
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/resources/random/:goal
router.get('/random/:goal', async (req, res) => {
  const goalData = GOAL_TAG_MAP[req.params.goal];
  if (!goalData) return res.json({ success: true, data: [] });
  try {
    const { data } = await supabase.from('resources').select('*').in('tag', goalData.tags).limit(6);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
