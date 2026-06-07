const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { suggestResources } = require('../lib/gemini');

// GET /api/resources/static/:tag
router.get('/static/:tag', async (req, res) => {
  const { data } = await supabase
    .from('resources').select('*').eq('tag', req.params.tag);
  res.json(data);
});

// POST /api/resources/suggest
// Body: { topic, level }
router.post('/suggest', async (req, res) => {
  const { topic, level } = req.body;
  try {
    const suggestions = await suggestResources(topic, level);
    res.json({ success: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;