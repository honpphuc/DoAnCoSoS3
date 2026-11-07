/**
 * lib/gemini.js — Pathfinder AI Integration (Gemini AI Dynamic Engine)
 *
 * Chức năng:
 *   - Gọi trực tiếp Gemini API (Google AI) bằng model siêu tốc (gemini-3.5-flash-lite, gemini-3.1-flash-lite)
 *   - Sinh lộ trình học động
 *   - Sinh tài liệu ôn tập chuyên sâu dài & đa chiều (Luồng 1)
 *   - Sinh bộ câu hỏi ôn tập theo đúng loại được chọn: Trắc nghiệm / Tự luận (Luồng 2 song song)
 *   - Chấm điểm bài tự luận và đưa ra nhận xét, gợi ý sửa đổi chi tiết bằng AI
 *   - Sinh dữ liệu Game tương tác ôn tập bài cũ (Memory Match / Speed Quiz)
 */

'use strict';

const supabase = require('./supabase');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

// Các model flash-lite phản hồi nhanh và ổn định nhất
const FAST_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
];

if (GEMINI_API_KEY) {
  console.log('🤖 Gemini AI Active — Models: ' + FAST_MODELS.join(', '));
} else {
  console.warn('⚠️ GEMINI_API_KEY chưa được cấu hình.');
}

/**
 * Trích xuất và parse JSON an toàn kể cả khi có markdown hoặc ký tự thừa
 */
function safeParseJson(rawText) {
  if (!rawText) throw new Error('Phản hồi từ AI rỗng.');

  let text = rawText.trim();
  // Bỏ markdown code block
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  // Tìm vị trí bắt đầu và kết thúc của JSON Object hoặc Array
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIdx = 0;
  let endIdx = text.length;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    const lastBrace = text.lastIndexOf('}');
    if (lastBrace !== -1) endIdx = lastBrace + 1;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    const lastBracket = text.lastIndexOf(']');
    if (lastBracket !== -1) endIdx = lastBracket + 1;
  }

  const jsonSubstring = text.substring(startIdx, endIdx);

  try {
    return JSON.parse(jsonSubstring);
  } catch (err) {
    // Sửa các lỗi phổ biến như trailing commas
    const cleaned = jsonSubstring
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    return JSON.parse(cleaned);
  }
}

/**
 * Gọi REST API của Gemini trực tiếp với cơ chế tự động thử model tiếp theo nếu gặp lỗi
 */
async function callGemini(prompt, timeoutMs = 90000) {
  if (!GEMINI_API_KEY) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong file .env.');
  }

  let lastError = null;

  for (const model of FAST_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    try {
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      const data = await response.json();

      if (!response.ok || data.error) {
        const errMsg = data.error?.message || `HTTP ${response.status}`;
        console.warn(`[Gemini] ${model} warning: ${errMsg}. Thử model dự phòng...`);
        lastError = new Error(errMsg);
        continue;
      }

      const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawContent) {
        throw new Error('Gemini API không trả về nội dung.');
      }

      return safeParseJson(rawContent);

    } catch (err) {
      console.warn(`[Gemini] ${model} failed:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`Không thể kết nối tới Gemini AI (${lastError?.message || 'Mạng chậm hoặc quá tải'}). Vui lòng thử lại.`);
}

// ── GOAL_TAG_MAP ─────────────────────────────────────────────────────────────
const GOAL_TAG_MAP = {
  ielts: {
    label: 'IELTS / Tiếng Anh',
    tags: ['ielts-listening', 'ielts-reading', 'ielts-writing', 'ielts-speaking', 'ielts-vocab', 'ielts-grammar'],
    topicTagMap: {
      'listening': 'ielts-listening', 'nghe': 'ielts-listening',
      'reading': 'ielts-reading', 'đọc': 'ielts-reading',
      'writing': 'ielts-writing', 'viết': 'ielts-writing',
      'speaking': 'ielts-speaking', 'nói': 'ielts-speaking',
      'vocabulary': 'ielts-vocab', 'từ vựng': 'ielts-vocab',
      'grammar': 'ielts-grammar', 'ngữ pháp': 'ielts-grammar',
    },
  },
  programming: {
    label: 'Lập trình',
    tags: ['html-css', 'javascript', 'react', 'nodejs', 'python', 'git', 'sql', 'algorithm'],
    topicTagMap: {
      'html': 'html-css', 'css': 'html-css', 'tailwind': 'html-css',
      'javascript': 'javascript', 'js': 'javascript',
      'react': 'react', 'hooks': 'react',
      'node': 'nodejs', 'express': 'nodejs',
      'python': 'python', 'git': 'git',
      'sql': 'sql', 'database': 'sql',
      'algorithm': 'algorithm', 'thuật toán': 'algorithm',
    },
  },
  design: {
    label: 'Thiết kế',
    tags: ['design-basic', 'ui-ux', 'figma', 'design-system', 'graphic-design'],
    topicTagMap: {
      'color': 'design-basic', 'màu': 'design-basic',
      'typography': 'design-basic', 'font': 'design-basic',
      'ui': 'ui-ux', 'ux': 'ui-ux', 'figma': 'figma',
      'logo': 'graphic-design', 'animation': 'design-basic',
    },
  },
};

function findTagFromTopic(topic, goal) {
  const goalData = GOAL_TAG_MAP[goal];
  if (!goalData) return null;
  const lower = topic.toLowerCase();
  for (const [keyword, tag] of Object.entries(goalData.topicTagMap)) {
    if (lower.includes(keyword)) return tag;
  }
  return goalData.tags[0];
}

async function getResourcesFromDB(tag, limit = 2) {
  try {
    const { data } = await supabase.from('resources').select('title, url, type').eq('tag', tag).limit(limit);
    return data || [];
  } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SINH LỘ TRÌNH HỌC TẬP TỪ GEMINI
// ─────────────────────────────────────────────────────────────────────────────
async function generateRoadmap(goal, level, hoursPerDay) {
  const timeMap = { '0.5': 0.5, '1.5': 1.5, '3': 3, '15-30': 0.5, '1-2h': 1.5, '3h+': 3 };
  const hours = timeMap[String(hoursPerDay)] || parseFloat(hoursPerDay) || 1.5;
  const durationMin = Math.round(hours * 60);

  const goalLabels = {
    ielts: 'IELTS / Tiếng Anh học thuật',
    programming: 'Lập trình Full-stack Web & Công nghệ phần mềm',
    design: 'Thiết kế UI/UX & Thiết kế sản phẩm số',
  };
  const goalLabel = goalLabels[goal] || goal;
  const totalWeeks = level === 'beginner' ? 4 : level === 'advanced' ? 2 : 3;

  const prompt = `Bạn là cố vấn học tập xuất sắc. Hãy thiết kế lộ trình học tập bằng Tiếng Việt:
- Lĩnh vực: ${goalLabel}
- Trình độ: ${level}
- Thời gian học: ${durationMin} phút/ngày
- Số tuần: ${totalWeeks} tuần (Thứ 2 đến Thứ 6 mỗi tuần, mỗi tuần 5 bài học)

Trả về JSON chính xác theo cấu trúc:
{
  "title": "Tên lộ trình súc tích",
  "total_weeks": ${totalWeeks},
  "weeks": [
    {
      "week": 1,
      "theme": "Chủ đề của tuần",
      "tasks": [
        {
          "day": "Mon",
          "topic": "Tên bài học",
          "description": "Mục tiêu và kỹ năng sẽ đạt được trong buổi học."
        }
      ]
    }
  ]
}`;

  const data = await callGemini(prompt);
  for (const week of data.weeks) {
    for (const task of week.tasks) {
      task.duration_min = durationMin;
      const tag = findTagFromTopic(task.topic, goal);
      if (tag) {
        task.resources = await getResourcesFromDB(tag, 2);
        task.resource_tag = tag;
      } else {
        task.resources = [];
      }
    }
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TÍCH HỢP 2 LUỒNG SONG SONG:
//    - LUỒNG 1: TỔNG HỢP KIẾN THỨC CHI TIẾT CHUYÊN SÂU
//    - LUỒNG 2: SINH BỘ CÂU HỎI THEO ĐÚNG LOẠI ĐƯỢC CHỌN (TRẮC NGHIỆM / TỰ LUẬN)
// ─────────────────────────────────────────────────────────────────────────────
async function generateReviewMaterial(tasks, options = {}) {
  const {
    genSummary = true,
    genQuiz = true,
    genEssay = false,
    examDate,
    goal,
  } = options;

  if (!tasks || tasks.length === 0) {
    throw new Error('Danh sách bài học trống, không thể tạo tài liệu ôn tập.');
  }

  const taskCount = tasks.length;

  // Tính số lượng câu hỏi trắc nghiệm & tự luận theo khối lượng bài học
  let targetQuizCount = 5;
  if (taskCount === 1) {
    targetQuizCount = 4;
  } else if (taskCount <= 3) {
    targetQuizCount = 6;
  } else if (taskCount <= 6) {
    targetQuizCount = 10;
  } else if (taskCount <= 10) {
    targetQuizCount = 12;
  } else {
    targetQuizCount = 15;
  }

  let targetEssayCount = 2;
  if (taskCount <= 2) targetEssayCount = 2;
  else if (taskCount <= 5) targetEssayCount = 3;
  else targetEssayCount = 4;

  // Giữ danh sách bài học đầy đủ hoặc lấy mẫu đại diện nếu quá dài (>10 bài)
  const representativeTasks = tasks.length > 10
    ? tasks.filter((_, idx) => idx % Math.ceil(tasks.length / 10) === 0).slice(0, 10)
    : tasks;

  const taskBriefs = representativeTasks.map((t, idx) =>
    `[Bài ${idx + 1}] ${t.topic}: ${t.description ? t.description.substring(0, 120) : 'Lý thuyết nền tảng và bài tập thực hành.'}`
  ).join('\n');

  const examContext = examDate
    ? `Kỳ thi dự kiến vào ngày: ${examDate}. Hãy chú trọng vào các nội dung trọng tâm có xác suất cao xuất hiện trong đề thi và các bẫy thường gặp.`
    : '';

  console.log(`[Gemini Engine] Chạy 2 luồng song song: Summary(${genSummary}), Quiz(${genQuiz} - target ${targetQuizCount}), Essay(${genEssay} - target ${targetEssayCount}) trên ${taskCount} bài học...`);

  // ================= LUỒNG 1: TỔNG HỢP KIẾN THỨC CHI TIẾT =================
  let summaryPromise;
  if (genSummary) {
    const summaryPrompt = `Bạn là một giáo sư đại học và chuyên gia đầu ngành. Hãy biên soạn một TÀI LIỆU ÔN TẬP LÝ THUYẾT CHI TIẾT, CHUYÊN SÂU, ĐẦY ĐỦ ĐỘ SÂU HỌC THUẬT VÀ THỰC HÀNH bằng Tiếng Việt cho các chủ đề sau:
${taskBriefs}
${examContext}

YÊU CẦU ĐỘ SÂU VÀ CHI TIẾT TỐI ĐA:
- Không viết sơ sài vài gạch đầu dòng. Mỗi bài học (${representativeTasks.length} bài) phải được mổ xẻ phân tích kỹ lưỡng.
- Cấu trúc từng bài học trong mảng "summary":
  + "topic": Tên bài học chính xác
  + "estimated_minutes": Thời gian đọc ôn tập đề xuất (ví dụ: "15-20 phút")
  + "overview": Khái quát toàn cảnh 3-4 câu: lý do chủ đề này quan trọng, giải quyết vấn đề gì trong thực tế.
  + "core_knowledge": Mảng gồm ít nhất 3-4 kiến thức cốt lõi. Mỗi mục bắt buộc gồm:
      - "concept": Tên khái niệm / định lý / cú pháp / thẻ / phương thức
      - "explanation": Giải thích cặn kẽ 3-4 câu về bản chất, cơ chế hoạt động bên dưới, cách thức vận hành.
      - "example": Ví dụ minh họa cụ thể (đoạn code chuẩn, mẫu câu đàm thoại hoặc biểu thức rõ ràng)
  + "deep_dive": Phân tích chuyên sâu 3-4 câu về một khía cạnh nâng cao, mối liên kết với các chủ đề khác hoặc best practices khi đi làm thực tế.
  + "common_mistakes": Mảng gồm 2-3 lỗi sai kinh điển hoặc bẫy phổ biến người học hay mắc phải, kèm lý do tại sao sai và cách khắc phục.
  + "practical_application": Ứng dụng thực tế trong dự án hoặc công việc đời thực.
  + "exam_tips": Mẹo ghi nhớ nhanh hoặc chiến lược làm bài thi đạt điểm tuyệt đối.

Trả về JSON:
{
  "summary": [
    {
      "topic": "...",
      "estimated_minutes": "15 phút",
      "overview": "...",
      "core_knowledge": [
        {
          "concept": "...",
          "explanation": "...",
          "example": "..."
        }
      ],
      "deep_dive": "...",
      "common_mistakes": ["...", "..."],
      "practical_application": "...",
      "exam_tips": "..."
    }
  ]
}`;

    summaryPromise = callGemini(summaryPrompt, 90000)
      .then(res => res.summary || [])
      .catch(err => {
        console.warn('[Luồng 1 - Summary Warning]:', err.message);
        return [];
      });
  } else {
    summaryPromise = Promise.resolve([]);
  }

  // ================= LUỒNG 2: SINH CÂU HỎI ÔN TẬP (CHÍNH XÁC THEO LOẠI ĐƯỢC CHỌN) =================
  let questionPromise;

  // Kiểm tra chỉ sinh đúng loại câu hỏi được người dùng chọn
  if (genQuiz || genEssay) {
    let questionInstructions = '';
    let jsonStructure = '';

    if (genQuiz && !genEssay) {
      // CHỈ TRẮC NGHIỆM
      questionInstructions = `
CHẾ ĐỘ: NGƯỜI DÙNG CHỈ CHỌN TRẮC NGHIỆM.
- Bạn PHẢI tạo ĐÚNG ${targetQuizCount} CÂU HỎI TRẮC NGHIỆM tình huống tư duy và vận dụng kiến thức thực tế.
- Tuyệt đối KHÔNG ĐƯỢC tạo câu hỏi tự luận. Trả về thuộc tính "essay": [].
- Mỗi câu trắc nghiệm có 4 lựa chọn (A, B, C, D), có đáp án đúng rõ ràng và giải thích cặn kẽ vì sao phương án đó đúng và các phương án kia sai.`;
      jsonStructure = `
{
  "quiz": [
    {
      "id": 1,
      "topic_reference": "Tên chủ đề liên quan",
      "question": "Câu hỏi tình huống thực tế?",
      "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
      "answer": "A. Lựa chọn 1",
      "explanation": "Giải thích chi tiết vì sao A đúng và các đáp án khác sai."
    }
  ],
  "essay": []
}`;
    } else if (!genQuiz && genEssay) {
      // CHỈ TỰ LUẬN
      questionInstructions = `
CHẾ ĐỘ: NGƯỜI DÙNG CHỈ CHỌN CÂU HỎI TỰ LUẬN / ÔN TẬP TỰ LUẬN.
- Bạn PHẢI tạo ĐÚNG ${targetEssayCount} CÂU HỎI TỰ LUẬN đòi hỏi tư duy phân tích, so sánh hoặc thiết kế giải pháp.
- Tuyệt đối KHÔNG ĐƯỢC tạo câu hỏi trắc nghiệm. Trả về thuộc tính "quiz": [].
- Mỗi câu tự luận cần có: câu hỏi rõ ràng, thang điểm tối đa (10 điểm), các tiêu chí chấm điểm cụ thể, và gợi ý dàn ý phân tích.`;
      jsonStructure = `
{
  "quiz": [],
  "essay": [
    {
      "id": 1,
      "topic_reference": "Tên chủ đề liên quan",
      "question": "Nội dung câu hỏi tự luận vận dụng chuyên sâu?",
      "max_score": 10,
      "evaluation_criteria": "3 điểm cho khái niệm chính xác; 4 điểm cho phân tích ví dụ; 3 điểm cho so sánh và đánh giá.",
      "hint": "Gợi ý các ý chính cần có trong bài làm..."
    }
  ]
}`;
    } else {
      // CẢ TRẮC NGHIỆM VÀ TỰ LUẬN
      questionInstructions = `
CHẾ ĐỘ: NGƯỜI DÙNG CHỌN CẢ TRẮC NGHIỆM VÀ TỰ LUẬN.
- Tạo ĐÚNG ${targetQuizCount} câu trắc nghiệm tình huống tư duy ("quiz").
- Tạo ĐÚNG ${targetEssayCount} câu hỏi tự luận vận dụng chuyên sâu ("essay") có kèm thang điểm và tiêu chí chấm.`;
      jsonStructure = `
{
  "quiz": [
    {
      "id": 1,
      "topic_reference": "Tên chủ đề liên quan",
      "question": "Nội dung câu hỏi tình huống thực tế?",
      "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
      "answer": "A. Lựa chọn 1",
      "explanation": "Giải thích chi tiết vì sao đúng."
    }
  ],
  "essay": [
    {
      "id": 1,
      "topic_reference": "Tên chủ đề liên quan",
      "question": "Nội dung câu hỏi tự luận?",
      "max_score": 10,
      "evaluation_criteria": "Tiêu chí chấm điểm cụ thể...",
      "hint": "Gợi ý dàn bài..."
    }
  ]
}`;
    }

    const questionPrompt = `Bạn là chuyên gia khảo thí và biên soạn đề thi quốc gia. Hãy tạo bộ câu hỏi kiểm tra đánh giá năng lực bằng Tiếng Việt dựa trên các chủ đề sau:
${taskBriefs}
${examContext}

YÊU CẦU NGHIÊM NGẶT:
${questionInstructions}

Trả về JSON đúng cấu trúc:
${jsonStructure}`;

    questionPromise = callGemini(questionPrompt, 90000)
      .then(res => ({
        quiz: genQuiz ? (res.quiz || []) : [],
        essay: genEssay ? (res.essay || []) : [],
      }))
      .catch(err => {
        console.warn('[Luồng 2 - Questions Warning]:', err.message);
        return { quiz: [], essay: [] };
      });
  } else {
    // Không chọn trắc nghiệm lẫn tự luận
    questionPromise = Promise.resolve({ quiz: [], essay: [] });
  }

  // Chạy 2 luồng song song
  const [summaryResult, questionsResult] = await Promise.all([summaryPromise, questionPromise]);

  // Kiểm tra tính hợp lệ
  if (genQuiz && (!questionsResult.quiz || questionsResult.quiz.length === 0)) {
    throw new Error('AI chưa hoàn thành được bộ câu hỏi trắc nghiệm. Vui lòng bấm thử lại.');
  }
  if (genEssay && (!questionsResult.essay || questionsResult.essay.length === 0)) {
    throw new Error('AI chưa hoàn thành được bộ câu hỏi tự luận. Vui lòng bấm thử lại.');
  }

  return {
    success: true,
    task_count: taskCount,
    total_quiz_questions: questionsResult.quiz ? questionsResult.quiz.length : 0,
    total_essay_questions: questionsResult.essay ? questionsResult.essay.length : 0,
    summary: summaryResult,
    quiz: questionsResult.quiz || [],
    essay: questionsResult.essay || [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CHẤM ĐIỂM BÀI TỰ LUẬN VÀ GỢI Ý CHỈNH SỬA CHI TIẾT BẰNG AI
// ─────────────────────────────────────────────────────────────────────────────
async function gradeEssayAnswer({ question, studentAnswer, topic = '', hint = '', evaluationCriteria = '', maxScore = 10 }) {
  if (!question || !studentAnswer || !studentAnswer.trim()) {
    throw new Error('Thiếu câu hỏi hoặc bài làm của học viên.');
  }

  const prompt = `Bạn là một giám khảo chấm thi đại học giàu kinh nghiệm, công tâm, khắt khe về mặt kiến thức nhưng luôn có tinh thần sư phạm tích cực, hướng dẫn học viên tiến bộ.

THÔNG TIN BÀI THI:
- Chủ đề: ${topic || 'Kiến thức chuyên môn'}
- Câu hỏi: ${question}
- Thang điểm tối đa: ${maxScore} điểm
${evaluationCriteria ? `- Tiêu chí chấm điểm: ${evaluationCriteria}` : ''}
${hint ? `- Gợi ý lý thuyết trọng tâm: ${hint}` : ''}

BÀI LÀM CỦA HỌC VIÊN:
"""
${studentAnswer.trim()}
"""

NHIỆM VỤ CỦA GIÁM KHẢO:
1. Đọc và phân tích kỹ lưỡng từng ý trong bài làm của học viên so với yêu cầu câu hỏi.
2. Cho điểm chính xác trên thang ${maxScore} (có thể có số thập phân như 7.5, 8.5, 9.0).
3. Đưa ra đánh giá toàn diện gồm:
   - "score": Điểm số (float hoặc number, ví dụ: 8.0)
   - "max_score": ${maxScore}
   - "grade_level": Xếp loại ("Xuất sắc" / "Giỏi" / "Khá" / "Trung bình" / "Cần nỗ lực nhiều")
   - "general_feedback": Lời nhận xét tổng quát 2-3 câu về bài làm.
   - "strengths": Mảng 2-3 điểm sáng, kiến thức học viên đã nắm vững, lập luận tốt.
   - "weaknesses": Mảng 2-3 điểm còn thiếu sót, sai lệch kiến thức hoặc chưa chặt chẽ.
   - "improvement_suggestions": Mảng 2-4 hướng dẫn cụ thể cách sửa đổi từng đoạn, bổ sung ý gì để đạt điểm tuyệt đối.
   - "improved_answer": Viết lại một bài làm mẫu hoàn hảo, chuyên nghiệp, đạt điểm tối đa ${maxScore}/${maxScore} để học viên tham khảo và đối chiếu.

Trả về JSON chính xác:
{
  "score": 8.5,
  "max_score": ${maxScore},
  "grade_level": "Giỏi",
  "general_feedback": "...",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "improvement_suggestions": ["...", "..."],
  "improved_answer": "..."
}`;

  console.log(`[Gemini Essay Grader] Chấm điểm bài làm cho câu hỏi: "${question.substring(0, 60)}..."`);
  const result = await callGemini(prompt, 60000);

  if (!result || typeof result.score === 'undefined') {
    throw new Error('AI không thể hoàn tất việc chấm điểm bài tự luận. Vui lòng thử lại.');
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GAME CHƠI TƯƠNG TÁC GIÚP ÔN TẬP BÀI CŨ (MEMORY MATCH & SPEED QUIZ)
// ─────────────────────────────────────────────────────────────────────────────
async function generateGameData({ tasks, gameType = 'memory', goal = '' }) {
  if (!tasks || tasks.length === 0) {
    throw new Error('Không có bài học nào được chọn để tạo game.');
  }

  const taskBriefs = tasks.slice(0, 8).map((t, idx) =>
    `- ${t.topic}: ${t.description ? t.description.substring(0, 90) : ''}`
  ).join('\n');

  if (gameType === 'memory') {
    // GAME LẬT THẺ TRÍ NHỚ (MEMORY MATCH / FLIP CARD)
    // Sinh ra đúng 6 - 8 cặp thẻ ghép đôi (khái niệm <-> định nghĩa / công dụng / code)
    const prompt = `Bạn là nhà thiết kế game giáo dục thông minh. Hãy trích xuất và tạo 6 CẶP THẺ GHÉP ĐÔI (tổng cộng 12 thẻ) để chơi trò "Lật Thẻ Trí Nhớ - Memory Match" dựa trên các bài học sau:
${taskBriefs}

Mỗi cặp thẻ gồm:
1. "term": Thuật ngữ, từ khóa, tên hàm, thẻ, hoặc khái niệm ngắn (dưới 6 từ).
2. "definition": Ý nghĩa, giải thích ngắn gọn, công dụng, hoặc ví dụ minh họa (dưới 15 từ, rõ ràng, không trùng với term).
3. "category": Tên bài học hoặc chủ đề liên quan.

Trả về JSON:
{
  "game_type": "memory",
  "title": "Thử Thách Lật Thẻ Trí Nhớ",
  "instructions": "Tìm và lật ghép đúng cặp Khái niệm và Định nghĩa tương ứng!",
  "pairs": [
    {
      "pair_id": 1,
      "term": "Thẻ <nav>",
      "definition": "Định nghĩa thanh điều hướng chứa các liên kết chính",
      "category": "HTML5 Semantic"
    }
  ]
}`;

    const data = await callGemini(prompt, 45000);
    return data;

  } else {
    // GAME ĐUA TỐC ĐỘ (SPEED QUIZ RUSH)
    // Sinh ra 8 câu hỏi phản xạ nhanh 10 giây
    const prompt = `Bạn là nhà thiết kế game trắc nghiệm tốc độ (Speed Quiz). Hãy tạo 8 câu đố phản xạ nhanh thú vị, có tính giải đố cao dựa trên các bài học sau:
${taskBriefs}

Yêu cầu:
- Câu hỏi ngắn gọn, trực diện, kích thích phản xạ trong 10 giây.
- 4 lựa chọn ngắn gọn A, B, C, D.
- Đáp án đúng và giải thích vui vẻ 1 câu.

Trả về JSON:
{
  "game_type": "speed",
  "title": "Đấu Trường Tốc Độ 10 Giây",
  "instructions": "Trả lời thật nhanh trước khi bom đếm ngược phát nổ để nhân đôi điểm số!",
  "questions": [
    {
      "id": 1,
      "question": "Câu hỏi ngắn?",
      "options": ["A. Lựa chọn 1", "B. Lựa chọn 2", "C. Lựa chọn 3", "D. Lựa chọn 4"],
      "answer": "A. Lựa chọn 1",
      "explanation": "Giải thích ngắn 1 câu."
    }
  ]
}`;

    const data = await callGemini(prompt, 45000);
    return data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GỢI Ý TÀI LIỆU HỌC TẬP TỪ GEMINI
// ─────────────────────────────────────────────────────────────────────────────
async function suggestResources(topic, level, goal) {
  const tag = goal ? findTagFromTopic(topic, goal) : null;
  const dbResults = tag ? await getResourcesFromDB(tag, 3) : [];
  if (dbResults.length > 0) {
    return dbResults.map(r => ({
      ...r,
      reason: `Tài liệu tuyển chọn chính thống cho chủ đề "${topic}".`,
    }));
  }

  if (GEMINI_API_KEY) {
    try {
      const prompt = `Gợi ý 3 tài liệu học tập hoặc video YouTube bằng Tiếng Việt cho chủ đề: "${topic}" (${goal || 'học tập'}, trình độ: ${level || 'cơ bản'}).
Trả về JSON:
{
  "resources": [
    {
      "title": "Tên bài giảng hoặc tài liệu",
      "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(topic)}",
      "type": "video",
      "reason": "Lý do phù hợp với bài học"
    }
  ]
}`;
      const data = await callGemini(prompt, 30000);
      if (data?.resources?.length > 0) return data.resources;
    } catch (e) {
      console.warn('Gemini suggestResources fallback:', e.message);
    }
  }

  const q = encodeURIComponent(topic);
  return [
    {
      title: `Bài giảng video: ${topic}`,
      url: `https://www.youtube.com/results?search_query=${q}+bài+giảng`,
      type: 'video',
      reason: 'Tìm kiếm video bài giảng thực tế trên YouTube theo chủ đề này.',
    },
  ];
}

module.exports = {
  generateRoadmap,
  generateReviewMaterial,
  gradeEssayAnswer,
  generateGameData,
  suggestResources,
  findTagFromTopic,
  callGemini,
  GOAL_TAG_MAP,
};
