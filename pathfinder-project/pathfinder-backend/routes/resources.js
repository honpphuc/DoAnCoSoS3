const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { GOAL_TAG_MAP, findTagFromTopic } = require('../lib/gemini');

function detectGoalFromTopic(topic = '') {
  const lower = topic.toLowerCase();

  if (lower.includes('ielts') || lower.includes('listening') || lower.includes('reading') || lower.includes('writing') || lower.includes('speaking')) {
    return 'ielts';
  }

  if (lower.includes('figma') || lower.includes('ui') || lower.includes('ux') || lower.includes('design')) {
    return 'design';
  }

  return 'programming';
}

function fallbackResources(topic) {
  const q = encodeURIComponent(topic);

  return [
    {
      title: `Video bài giảng về ${topic}`,
      url: `https://www.youtube.com/results?search_query=${q}+bài+giảng`,
      type: 'video',
      reason: 'Tìm video bài giảng phù hợp trên YouTube.',
    },
    {
      title: `Tài liệu học về ${topic}`,
      url: `https://www.google.com/search?q=${q}+tài+liệu+học+tập`,
      type: 'article',
      reason: 'Tìm tài liệu đọc thêm và bài hướng dẫn.',
    },
    {
      title: `Bài thực hành về ${topic}`,
      url: `https://www.google.com/search?q=${q}+practice+exercise`,
      type: 'practice',
      reason: 'Tìm bài tập thực hành để luyện thêm.',
    },
  ];
}

router.post('/suggest', async (req, res) => {
  const { topic, goal } = req.body;

  if (!topic) {
    return res.status(400).json({ success: false, error: 'Thiếu topic.' });
  }

  try {
    const goalKey = GOAL_TAG_MAP[goal] ? goal : detectGoalFromTopic(topic);
    const tag = findTagFromTopic(topic, goalKey);

    let resources = [];

    if (tag) {
      const { data } = await supabase
        .from('resources')
        .select('tag, title, url, type')
        .eq('tag', tag)
        .limit(6);

      resources = data || [];
    }

    if (resources.length === 0 && GOAL_TAG_MAP[goalKey]) {
      const { data } = await supabase
        .from('resources')
        .select('tag, title, url, type')
        .in('tag', GOAL_TAG_MAP[goalKey].tags)
        .limit(6);

      resources = data || [];
    }

    const result = resources.length > 0
      ? resources.map(r => ({
          ...r,
          reason: `Phù hợp với bài học "${topic}".`,
        }))
      : fallbackResources(topic);

    res.json({ success: true, data: result });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      data: fallbackResources(topic),
    });
  }
});

router.get('/goal/:goal', async (req, res) => {
  const goalData = GOAL_TAG_MAP[req.params.goal];

  if (!goalData) {
    return res.status(400).json({ success: false, error: 'Goal không hợp lệ.' });
  }

  try {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .in('tag', goalData.tags)
      .order('tag');

    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/random/:goal', async (req, res) => {
  const goalData = GOAL_TAG_MAP[req.params.goal];

  if (!goalData) {
    return res.json({ success: true, data: [] });
  }

  try {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .in('tag', goalData.tags)
      .limit(6);

    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;