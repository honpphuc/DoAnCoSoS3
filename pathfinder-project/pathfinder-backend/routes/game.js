const express = require('express');
const router = express.Router();
const { generateGameData } = require('../lib/gemini');

// POST /api/game/generate
// Body: { tasks, gameType: 'memory' | 'speed', goal }
router.post('/generate', async (req, res) => {
  const {
    tasks = [],
    gameType = 'memory',
    goal = '',
  } = req.body;

  if (!tasks || tasks.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng chọn phạm vi bài học để tạo dữ liệu trò chơi.',
    });
  }

  try {
    const gameData = await generateGameData({
      tasks,
      gameType,
      goal,
    });

    res.json({
      success: true,
      gameData,
    });

  } catch (err) {
    console.error('Game generate error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Không thể tạo màn chơi game lúc này. Vui lòng thử lại.',
    });
  }
});

module.exports = router;
