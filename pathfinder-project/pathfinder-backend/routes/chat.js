const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../lib/supabase');
const { GOAL_TAG_MAP, findTagFromTopic } = require('../lib/gemini');

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

function detectGoal(goal = '') {
  const lower = goal.toLowerCase();

  if (lower.includes('ielts') || lower.includes('english') || lower.includes('tiếng anh')) {
    return 'ielts';
  }

  if (lower.includes('design') || lower.includes('thiết kế') || lower.includes('ui') || lower.includes('ux')) {
    return 'design';
  }

  return 'programming';
}

async function getResourcesForTask(topic, goalKey) {
  const tag = findTagFromTopic(topic, goalKey);

  if (!tag) return [];

  const { data } = await supabase
    .from('resources')
    .select('title, url, type, tag')
    .eq('tag', tag)
    .limit(3);

  return data || [];
}

router.post('/', async (req, res) => {
  const { message, roadmap_id, history = [] } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ success: false, reply: 'Tin nhắn trống.' });
  }

  try {
    let roadmap = null;
    let tasks = [];
    let nextTasks = [];
    let goalKey = 'programming';
    let resources = [];

    if (roadmap_id) {
      const { data: roadmapData } = await supabase
        .from('roadmaps')
        .select('id, title, goal, total_weeks')
        .eq('id', roadmap_id)
        .single();

      roadmap = roadmapData;

      const { data: taskData } = await supabase
        .from('tasks')
        .select('id, topic, week_number, day_label, is_completed')
        .eq('roadmap_id', roadmap_id)
        .order('week_number', { ascending: true });

      tasks = taskData || [];
      nextTasks = tasks.filter(t => !t.is_completed).slice(0, 3);

      goalKey = detectGoal(roadmap?.goal || roadmap?.title || '');

      if (nextTasks.length > 0) {
        resources = await getResourcesForTask(nextTasks[0].topic, goalKey);
      }
    }

    const done = tasks.filter(t => t.is_completed).length;
    const total = tasks.length;
    const percent = total > 0 ? Math.round(done / total * 100) : 0;

    const resourceText = resources.length > 0
      ? resources.map(r => `- ${r.title}: ${r.url}`).join('\n')
      : '';

    const lowerMsg = message.toLowerCase();

    if (!genAI) {
      if (lowerMsg.includes('tuần') || lowerMsg.includes('tiến độ')) {
        return res.json({
          success: true,
          reply: `Bạn đã hoàn thành ${done}/${total} bài (${percent}%). Lộ trình hiện tại: ${roadmap?.title || 'chưa xác định'}.`,
        });
      }

      if (lowerMsg.includes('học gì') || lowerMsg.includes('tiếp theo')) {
        const nextText = nextTasks.length > 0
          ? nextTasks.map(t => `Tuần ${t.week_number} - ${t.day_label}: ${t.topic}`).join('\n')
          : 'Bạn đã hoàn thành toàn bộ bài học trong lộ trình.';

        return res.json({
          success: true,
          reply: `Bài nên học tiếp theo:\n${nextText}`,
        });
      }

      if (lowerMsg.includes('tài liệu') || lowerMsg.includes('video') || lowerMsg.includes('bài giảng')) {
        return res.json({
          success: true,
          reply: resources.length > 0
            ? `Một số tài liệu phù hợp:\n${resourceText}`
            : 'Mình chưa tìm thấy tài liệu trong Supabase cho bài tiếp theo. Hãy bấm "Xem đề xuất" trong trang bài học để tìm thêm.',
        });
      }

      return res.json({
        success: true,
        reply: `Mình có thể hỗ trợ bạn xem tiến độ, bài học tiếp theo và tài liệu học tập. Bạn đang hoàn thành ${done}/${total} bài.`,
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

    const context = `
Bạn là trợ lý học tập Pathfinder AI.
Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng.

Lộ trình: ${roadmap?.title || 'Chưa có'}
Tiến độ: ${done}/${total} bài (${percent}%)
Bài tiếp theo:
${nextTasks.map(t => `- Tuần ${t.week_number}, ${t.day_label}: ${t.topic}`).join('\n') || '- Đã hoàn thành toàn bộ'}

Tài liệu liên quan:
${resourceText || 'Chưa có tài liệu phù hợp trong DB.'}
`;

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: context }] },
        { role: 'model', parts: [{ text: 'Tôi đã hiểu ngữ cảnh lộ trình.' }] },
        ...history.slice(-8).map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);

    res.json({
      success: true,
      reply: result.response.text(),
    });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      success: false,
      reply: 'Chat đang gặp lỗi kỹ thuật. Vui lòng thử lại.',
    });
  }
});

module.exports = router;