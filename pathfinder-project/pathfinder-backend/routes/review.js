const express = require('express');
const router = express.Router();
const { generateReviewMaterial, gradeEssayAnswer } = require('../lib/gemini');

// POST /api/review/generate
// Body: { tasks, week, examDate, goal, genSummary, genQuiz, genEssay }
router.post('/generate', async (req, res) => {
  const {
    tasks = [],
    week,
    examDate,
    goal,
    genSummary = true,
    genQuiz = true,
    genEssay = false,
  } = req.body;

  if (!tasks || tasks.length === 0) {
    return res.status(400).json({ success: false, error: 'Không có bài học nào để ôn tập.' });
  }

  // Đảm bảo kiểu boolean chuẩn xác
  const isSummary = genSummary === true || genSummary === 'true';
  const isQuiz = genQuiz === true || genQuiz === 'true';
  const isEssay = genEssay === true || genEssay === 'true';

  if (!isSummary && !isQuiz && !isEssay) {
    return res.status(400).json({ success: false, error: 'Vui lòng chọn ít nhất một thành phần ôn tập.' });
  }

  try {
    const result = await generateReviewMaterial(tasks, {
      genSummary: isSummary,
      genQuiz: isQuiz,
      genEssay: isEssay,
      examDate,
      goal,
    });

    res.json(result);

  } catch (err) {
    console.error('Review generate error:', err);
    res.status(500).json({ success: false, error: err.message || 'Không thể sinh tài liệu ôn tập lúc này.' });
  }
});

// POST /api/review/grade-essay
// Body: { question, studentAnswer, topic, hint, evaluationCriteria, maxScore }
router.post('/grade-essay', async (req, res) => {
  const {
    question,
    studentAnswer,
    topic = '',
    hint = '',
    evaluationCriteria = '',
    maxScore = 10,
  } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, error: 'Thiếu nội dung câu hỏi.' });
  }

  if (!studentAnswer || !studentAnswer.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập bài làm của bạn trước khi yêu cầu AI chấm điểm.' });
  }

  try {
    const evaluation = await gradeEssayAnswer({
      question,
      studentAnswer,
      topic,
      hint,
      evaluationCriteria,
      maxScore: Number(maxScore) || 10,
    });

    res.json({
      success: true,
      evaluation,
    });

  } catch (err) {
    console.error('Grade essay error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Hệ thống AI đang bận, không thể chấm điểm lúc này. Vui lòng thử lại.',
    });
  }
});

module.exports = router;
