const supabase = require('./supabase');

// ── Template roadmap tĩnh — không cần API key, hoàn toàn miễn phí ────────────
// Dữ liệu được thiết kế sẵn theo từng goal + level, đủ dùng cho đồ án

const GOAL_TAG_MAP = {
  ielts: {
    label: 'IELTS / Tiếng Anh',
    tags: ['ielts-listening','ielts-reading','ielts-writing','ielts-speaking','ielts-vocab','ielts-grammar'],
    topicTagMap: {
      'listening':'ielts-listening','nghe':'ielts-listening',
      'reading':'ielts-reading','đọc':'ielts-reading',
      'writing':'ielts-writing','viết':'ielts-writing',
      'speaking':'ielts-speaking','nói':'ielts-speaking',
      'vocabulary':'ielts-vocab','từ vựng':'ielts-vocab',
      'grammar':'ielts-grammar','ngữ pháp':'ielts-grammar',
    },
  },
  programming: {
    label: 'Lập trình',
    tags: ['html-css','javascript','react','nodejs','python','git','sql','algorithm','nextjs'],
    topicTagMap: {
      'html':'html-css','css':'html-css','tailwind':'html-css',
      'javascript':'javascript','js':'javascript',
      'react':'react','hooks':'react',
      'node':'nodejs','express':'nodejs',
      'python':'python','git':'git',
      'sql':'sql','database':'sql',
      'algorithm':'algorithm','thuật toán':'algorithm',
    },
  },
  design: {
    label: 'Thiết kế',
    tags: ['design-basic','ui-ux','figma','design-system','graphic-design','motion-design'],
    topicTagMap: {
      'color':'design-basic','màu':'design-basic',
      'typography':'design-basic','font':'design-basic',
      'ui':'ui-ux','ux':'ui-ux','figma':'figma',
      'logo':'graphic-design','animation':'motion-design',
    },
  },
};

// ── Templates chi tiết theo goal + level ─────────────────────────────────────
const TEMPLATES = {
  ielts: {
    beginner: {
      title: 'Lộ trình IELTS từ đầu (4 tuần)',
      total_weeks: 4,
      weeks: [
        { week: 1, theme: 'Nền tảng từ vựng & ngữ pháp', tasks: [
          { day:'Mon', topic:'Từ vựng chủ đề gia đình & con người', description:'Học 30 từ vựng thông dụng về gia đình, nghề nghiệp, ngoại hình. Thực hành qua flashcard.' },
          { day:'Tue', topic:'Ngữ pháp: Thì hiện tại đơn & hiện tại tiếp diễn', description:'Ôn lại cấu trúc và cách dùng hai thì cơ bản nhất trong tiếng Anh.' },
          { day:'Wed', topic:'Listening: Nghe điền từ (Section 1)', description:'Luyện nghe hội thoại hàng ngày, tập trung vào số, tên và địa chỉ.' },
          { day:'Thu', topic:'Reading: Skimming & Scanning cơ bản', description:'Học kỹ thuật đọc lướt tìm ý chính và đọc quét tìm thông tin cụ thể.' },
          { day:'Fri', topic:'Speaking: Tự giới thiệu bản thân (Part 1)', description:'Luyện trả lời các câu hỏi về bản thân, gia đình, quê quán.' },
        ]},
        { week: 2, theme: 'Kỹ năng Listening & Reading', tasks: [
          { day:'Mon', topic:'Listening: Điền form & bảng biểu', description:'Luyện dạng bài điền thông tin vào form, chú ý spelling và số liệu.' },
          { day:'Tue', topic:'Từ vựng chủ đề giáo dục & công việc', description:'Học 30 từ về trường học, đại học, công việc văn phòng.' },
          { day:'Wed', topic:'Reading: True/False/Not Given', description:'Nắm vững cách phân biệt 3 đáp án trong dạng bài phổ biến nhất IELTS.' },
          { day:'Thu', topic:'Ngữ pháp: Thì quá khứ & tương lai', description:'Ôn thì quá khứ đơn, quá khứ tiếp diễn và các cấu trúc tương lai.' },
          { day:'Fri', topic:'Writing Task 1: Mô tả biểu đồ cơ bản', description:'Học cấu trúc bài Task 1, luyện câu mở đầu và mô tả xu hướng chính.' },
        ]},
        { week: 3, theme: 'Writing & Speaking nâng dần', tasks: [
          { day:'Mon', topic:'Writing Task 2: Cấu trúc bài luận 4 đoạn', description:'Học cách viết intro, 2 thân bài và kết luận cho dạng Opinion Essay.' },
          { day:'Tue', topic:'Speaking Part 2: Cue card 2 phút', description:'Luyện nói liên tục 2 phút về một chủ đề quen thuộc có ghi chú.' },
          { day:'Wed', topic:'Từ vựng chủ đề môi trường & xã hội', description:'Học 30 từ học thuật về môi trường, biến đổi khí hậu, xã hội hiện đại.' },
          { day:'Thu', topic:'Listening: Multiple choice & matching', description:'Luyện 2 dạng bài khó hơn trong Section 3 và 4.' },
          { day:'Fri', topic:'Reading: Matching headings', description:'Chiến lược làm dạng ghép tiêu đề đoạn văn hiệu quả.' },
        ]},
        { week: 4, theme: 'Luyện đề & tổng ôn', tasks: [
          { day:'Mon', topic:'Thi thử Listening full test', description:'Làm 1 bài Listening hoàn chỉnh 40 phút, chấm điểm và phân tích lỗi sai.' },
          { day:'Tue', topic:'Thi thử Reading full test', description:'Làm 1 bài Reading hoàn chỉnh 60 phút, luyện quản lý thời gian.' },
          { day:'Wed', topic:'Viết hoàn chỉnh Task 1 + Task 2', description:'Viết cả 2 bài Writing trong 60 phút, tự chấm theo band descriptor.' },
          { day:'Thu', topic:'Speaking: Mock test cả 3 phần', description:'Tự thu âm và thực hành cả 3 part của IELTS Speaking.' },
          { day:'Fri', topic:'Ôn tập từ vựng & ngữ pháp trọng tâm', description:'Hệ thống lại toàn bộ từ vựng và ngữ pháp đã học trong 4 tuần.' },
        ]},
      ],
    },
    intermediate: {
      title: 'Lộ trình IELTS Band 6.0–6.5 (3 tuần)',
      total_weeks: 3,
      weeks: [
        { week: 1, theme: 'Nâng cao Listening & Reading', tasks: [
          { day:'Mon', topic:'Listening Section 3–4: Bài giảng học thuật', description:'Luyện nghe độc thoại phức tạp, ghi chép ý chính và chi tiết.' },
          { day:'Tue', topic:'Reading: Summary completion & sentence completion', description:'Chiến lược làm nhanh 2 dạng bài điền từ trong đoạn văn.' },
          { day:'Wed', topic:'Từ vựng học thuật (AWL – Academic Word List)', description:'Học 40 từ học thuật phổ biến nhất trong đề thi IELTS.' },
          { day:'Thu', topic:'Reading: Paragraph matching & short answers', description:'Luyện tốc độ và độ chính xác khi làm 2 dạng bài này.' },
          { day:'Fri', topic:'Listening: Diagram & map labelling', description:'Chiến lược theo dõi sơ đồ và bản đồ khi nghe.' },
        ]},
        { week: 2, theme: 'Writing Band 6+', tasks: [
          { day:'Mon', topic:'Task 1: Biểu đồ kết hợp (mixed charts)', description:'Luyện mô tả và so sánh 2 loại biểu đồ trong cùng một bài.' },
          { day:'Tue', topic:'Task 2: Discussion Essay', description:'Cấu trúc và từ nối cho dạng bài trình bày 2 quan điểm.' },
          { day:'Wed', topic:'Task 2: Problem & Solution Essay', description:'Cách phân tích vấn đề và đề xuất giải pháp logic.' },
          { day:'Thu', topic:'Từ nối & cohesion nâng cao', description:'Học 30 linking words nâng band điểm Coherence & Cohesion.' },
          { day:'Fri', topic:'Task 1: Process diagram & map', description:'Mô tả quy trình và bản đồ thay đổi theo thời gian.' },
        ]},
        { week: 3, theme: 'Speaking & Luyện đề tổng hợp', tasks: [
          { day:'Mon', topic:'Speaking Part 3: Thảo luận ý kiến', description:'Luyện diễn đạt quan điểm, đồng ý/không đồng ý và phát triển ý.' },
          { day:'Tue', topic:'Thi thử full test (Listening + Reading)', description:'Làm đề thi thật trong điều kiện thi, phân tích điểm yếu.' },
          { day:'Wed', topic:'Thi thử Writing (Task 1 + Task 2)', description:'Viết thi trong 60 phút, tự đánh giá theo 4 tiêu chí IELTS.' },
          { day:'Thu', topic:'Sửa lỗi Writing thường gặp Band 5-6', description:'Phân tích 10 lỗi ngữ pháp và từ vựng phổ biến nhất.' },
          { day:'Fri', topic:'Ôn tập và chiến lược thi thật', description:'Tổng ôn chiến lược làm bài, quản lý thời gian ngày thi.' },
        ]},
      ],
    },
    advanced: {
      title: 'Lộ trình IELTS Band 7.0+ (2 tuần)',
      total_weeks: 2,
      weeks: [
        { week: 1, theme: 'Kỹ năng Band 7 – Listening & Reading', tasks: [
          { day:'Mon', topic:'Listening: Luyện đề Cambridge 14–18', description:'Làm 2 bài test, phân tích kỹ từng câu sai và ghi chú pattern.' },
          { day:'Tue', topic:'Reading: Tốc độ và độ chính xác cao', description:'Luyện hoàn thành Reading trong 55 phút với độ chính xác 85%+.' },
          { day:'Wed', topic:'Writing Task 2: Band 7 – Lexical resource', description:'Nâng cao từ vựng học thuật, tránh lặp từ, dùng paraphrase chuyên nghiệp.' },
          { day:'Thu', topic:'Writing Task 1: Band 7 – Data overview', description:'Viết overview sắc nét, chọn lọc dữ liệu nổi bật, dùng số liệu chính xác.' },
          { day:'Fri', topic:'Speaking: Fluency & coherence Band 7', description:'Luyện nói tự nhiên, tránh dừng dài, dùng filler words thông minh.' },
        ]},
        { week: 2, theme: 'Luyện đề & hoàn thiện', tasks: [
          { day:'Mon', topic:'Mock test 1: Full IELTS (4 kỹ năng)', description:'Thi thử hoàn chỉnh cả 4 kỹ năng trong điều kiện giống thi thật.' },
          { day:'Tue', topic:'Phân tích lỗi sai chi tiết mock test 1', description:'Review toàn bộ đáp án, phân tích pattern lỗi và cách khắc phục.' },
          { day:'Wed', topic:'Mock test 2: Tập trung điểm yếu', description:'Làm đề tập trung vào 2 kỹ năng còn yếu nhất từ mock test 1.' },
          { day:'Thu', topic:'Writing: Chỉnh sửa và nâng band', description:'Viết lại 2 bài Writing từ mock test, tự nâng cấp lên band cao hơn.' },
          { day:'Fri', topic:'Chiến lược tâm lý và kỹ thuật ngày thi', description:'Chuẩn bị tâm lý, kỹ thuật kiểm tra đáp án và quản lý stress.' },
        ]},
      ],
    },
  },

  programming: {
    beginner: {
      title: 'Lộ trình Lập trình Web từ đầu (4 tuần)',
      total_weeks: 4,
      weeks: [
        { week: 1, theme: 'HTML & CSS cơ bản', tasks: [
          { day:'Mon', topic:'HTML: Cấu trúc trang web và các thẻ cơ bản', description:'Học cấu trúc HTML5, các thẻ heading, paragraph, link, image.' },
          { day:'Tue', topic:'HTML: Form, table và semantic tags', description:'Xây dựng form đăng nhập, bảng dữ liệu và dùng thẻ semantic.' },
          { day:'Wed', topic:'CSS: Selector, color và typography', description:'Học cách chọn phần tử, tô màu, định dạng chữ và font.' },
          { day:'Thu', topic:'CSS: Box model và layout cơ bản', description:'Hiểu margin, padding, border và cách phần tử chiếm không gian.' },
          { day:'Fri', topic:'Thực hành: Trang giới thiệu cá nhân', description:'Tự tạo trang web giới thiệu bản thân bằng HTML + CSS thuần.' },
        ]},
        { week: 2, theme: 'CSS Flexbox & JavaScript nhập môn', tasks: [
          { day:'Mon', topic:'CSS Flexbox: Căn chỉnh và layout linh hoạt', description:'Nắm vững flex-direction, justify-content, align-items để tạo layout.' },
          { day:'Tue', topic:'CSS Grid: Bố cục 2 chiều', description:'Dùng grid-template để tạo layout phức tạp cho trang web.' },
          { day:'Wed', topic:'JavaScript: Biến, kiểu dữ liệu và toán tử', description:'Học var/let/const, string, number, boolean và các phép tính.' },
          { day:'Thu', topic:'JavaScript: Câu lệnh điều kiện và vòng lặp', description:'Sử dụng if/else, for, while để điều khiển luồng chương trình.' },
          { day:'Fri', topic:'JavaScript: Function và DOM cơ bản', description:'Viết function, gọi hàm và thay đổi nội dung trang web bằng JS.' },
        ]},
        { week: 3, theme: 'JavaScript nâng cao & tương tác', tasks: [
          { day:'Mon', topic:'JavaScript: Array và Object', description:'Làm việc với mảng, đối tượng và các phương thức map/filter/reduce.' },
          { day:'Tue', topic:'JavaScript: Event và DOM manipulation', description:'Bắt sự kiện click, input và thay đổi giao diện động.' },
          { day:'Wed', topic:'JavaScript: Fetch API và JSON', description:'Gọi API đơn giản, xử lý dữ liệu JSON và hiển thị lên trang.' },
          { day:'Thu', topic:'Git & GitHub: Quản lý source code', description:'Học git init, add, commit, push và tạo repository trên GitHub.' },
          { day:'Fri', topic:'Thực hành: Todo List app', description:'Xây dựng ứng dụng quản lý công việc với HTML, CSS, JS thuần.' },
        ]},
        { week: 4, theme: 'Dự án tổng kết', tasks: [
          { day:'Mon', topic:'Lên kế hoạch và thiết kế dự án cuối', description:'Lên ý tưởng, vẽ wireframe và phân chia tính năng cho dự án.' },
          { day:'Tue', topic:'Xây dựng giao diện dự án', description:'Code HTML/CSS cho toàn bộ giao diện dự án.' },
          { day:'Wed', topic:'Thêm tính năng JavaScript vào dự án', description:'Viết logic JS, kết nối các thành phần và xử lý tương tác.' },
          { day:'Thu', topic:'Debug và hoàn thiện dự án', description:'Kiểm tra lỗi, fix bug và tối ưu giao diện responsive.' },
          { day:'Fri', topic:'Deploy lên GitHub Pages', description:'Đưa dự án lên internet miễn phí bằng GitHub Pages.' },
        ]},
      ],
    },
    intermediate: {
      title: 'Lộ trình ReactJS & Node.js (3 tuần)',
      total_weeks: 3,
      weeks: [
        { week: 1, theme: 'ReactJS cơ bản', tasks: [
          { day:'Mon', topic:'React: JSX, Component và Props', description:'Hiểu cú pháp JSX, tạo functional component và truyền dữ liệu qua props.' },
          { day:'Tue', topic:'React: State với useState Hook', description:'Quản lý trạng thái component, re-render và cập nhật UI động.' },
          { day:'Wed', topic:'React: useEffect và vòng đời component', description:'Xử lý side effects, gọi API khi component mount và cleanup.' },
          { day:'Thu', topic:'React: React Router – điều hướng trang', description:'Cài đặt React Router, tạo routes và navigate giữa các trang.' },
          { day:'Fri', topic:'Thực hành: Todo App với React', description:'Rebuild Todo App bằng React, áp dụng useState và component.' },
        ]},
        { week: 2, theme: 'Node.js & Express Backend', tasks: [
          { day:'Mon', topic:'Node.js: Module, npm và file system', description:'Hiểu CommonJS module, cài package npm và đọc/ghi file.' },
          { day:'Tue', topic:'Express: Tạo REST API cơ bản', description:'Setup Express server, tạo routes GET/POST/PUT/DELETE.' },
          { day:'Wed', topic:'Express: Middleware và xử lý lỗi', description:'Viết custom middleware, xử lý lỗi toàn cục và validate input.' },
          { day:'Thu', topic:'Database: Kết nối và query với SQL', description:'Kết nối PostgreSQL hoặc SQLite, thực hiện CRUD cơ bản.' },
          { day:'Fri', topic:'Thực hành: REST API quản lý sản phẩm', description:'Xây dựng API đầy đủ với Express + database.' },
        ]},
        { week: 3, theme: 'Fullstack & Deploy', tasks: [
          { day:'Mon', topic:'Kết nối React Frontend với Express Backend', description:'Gọi API từ React, xử lý CORS và quản lý state từ server.' },
          { day:'Tue', topic:'Authentication: JWT và session', description:'Xây dựng đăng nhập/đăng ký với JWT token.' },
          { day:'Wed', topic:'Deploy backend lên Render hoặc Railway', description:'Đưa Node.js server lên cloud miễn phí và cấu hình environment.' },
          { day:'Thu', topic:'Deploy frontend lên Vercel hoặc Netlify', description:'Build React app và deploy, kết nối với backend đã deploy.' },
          { day:'Fri', topic:'Hoàn thiện dự án fullstack', description:'Fix bug, tối ưu performance và viết README cho dự án.' },
        ]},
      ],
    },
    advanced: {
      title: 'Lộ trình Senior Developer (2 tuần)',
      total_weeks: 2,
      weeks: [
        { week: 1, theme: 'Architecture & Performance', tasks: [
          { day:'Mon', topic:'Clean Architecture và SOLID principles', description:'Áp dụng nguyên lý thiết kế phần mềm cho dự án thực tế.' },
          { day:'Tue', topic:'Database optimization: Index và Query tuning', description:'Phân tích slow query, tạo index phù hợp và tối ưu N+1 problem.' },
          { day:'Wed', topic:'Caching: Redis và chiến lược cache', description:'Cài đặt Redis, áp dụng cache-aside pattern cho API.' },
          { day:'Thu', topic:'Testing: Unit test và Integration test', description:'Viết test với Jest, đạt coverage 80%+ cho module quan trọng.' },
          { day:'Fri', topic:'CI/CD với GitHub Actions', description:'Tự động hóa test, build và deploy khi push code lên GitHub.' },
        ]},
        { week: 2, theme: 'System Design & Best Practices', tasks: [
          { day:'Mon', topic:'Microservices vs Monolith: Khi nào dùng gì', description:'Phân tích trade-off và thiết kế hệ thống phù hợp với scale.' },
          { day:'Tue', topic:'API Design: REST best practices & GraphQL', description:'Thiết kế API chuẩn, versioning, pagination và error handling.' },
          { day:'Wed', topic:'Security: OWASP Top 10 cho Web Developer', description:'Phòng tránh XSS, SQL Injection, CSRF và các lỗ hổng phổ biến.' },
          { day:'Thu', topic:'Docker: Container hóa ứng dụng', description:'Viết Dockerfile, docker-compose và chạy app trong container.' },
          { day:'Fri', topic:'Code Review & Technical Documentation', description:'Kỹ năng review code, viết tech doc và onboarding teammate.' },
        ]},
      ],
    },
  },

  design: {
    beginner: {
      title: 'Lộ trình Thiết kế UI/UX từ đầu (4 tuần)',
      total_weeks: 4,
      weeks: [
        { week: 1, theme: 'Nền tảng thiết kế', tasks: [
          { day:'Mon', topic:'Nguyên lý thiết kế: Contrast, Alignment, Repetition', description:'Học 4 nguyên lý C.A.R.P và cách áp dụng trong thiết kế thực tế.' },
          { day:'Tue', topic:'Lý thuyết màu sắc: Color wheel và phối màu', description:'Hiểu vòng tròn màu, phối màu complementary, analogous và triadic.' },
          { day:'Wed', topic:'Typography: Chọn font và hierarchy chữ', description:'Chọn cặp font phù hợp, tạo hierarchy với size và weight.' },
          { day:'Thu', topic:'Figma: Làm quen giao diện và công cụ cơ bản', description:'Cài Figma, tạo frame, vẽ hình, thêm text và export file.' },
          { day:'Fri', topic:'Thực hành: Thiết kế danh thiếp', description:'Tạo danh thiếp cá nhân áp dụng nguyên lý đã học.' },
        ]},
        { week: 2, theme: 'UI Components & Layout', tasks: [
          { day:'Mon', topic:'Figma: Auto Layout và component cơ bản', description:'Dùng Auto Layout tạo button, card, list tự động co giãn.' },
          { day:'Tue', topic:'UI Patterns: Navigation, Form, Card', description:'Nghiên cứu và thiết kế các pattern UI phổ biến nhất.' },
          { day:'Wed', topic:'Grid system và spacing trong UI', description:'Dùng 8pt grid system và spacing scale cho layout nhất quán.' },
          { day:'Thu', topic:'Icon và illustration trong thiết kế', description:'Dùng icon library, tạo illustration đơn giản và flat design.' },
          { day:'Fri', topic:'Thực hành: Thiết kế màn hình đăng nhập', description:'Thiết kế login screen hoàn chỉnh cho app mobile.' },
        ]},
        { week: 3, theme: 'UX Research & Prototype', tasks: [
          { day:'Mon', topic:'UX Research: User persona và user journey', description:'Tạo persona từ research, vẽ user journey map đơn giản.' },
          { day:'Tue', topic:'Wireframing: Lo-fi và mid-fi wireframe', description:'Sketch ý tưởng trên giấy rồi chuyển sang Figma low-fidelity.' },
          { day:'Wed', topic:'Figma Prototype: Tạo flow tương tác', description:'Kết nối các màn hình, tạo transition và interactive prototype.' },
          { day:'Thu', topic:'Usability testing cơ bản', description:'Phương pháp test với 5 người dùng, ghi nhận feedback.' },
          { day:'Fri', topic:'Thực hành: Prototype app đặt đồ ăn', description:'Thiết kế 5 màn hình chính và tạo prototype tương tác.' },
        ]},
        { week: 4, theme: 'Dự án thực tế & Portfolio', tasks: [
          { day:'Mon', topic:'Design System: Color, Typography, Component', description:'Xây dựng design system nhỏ với style guide và component library.' },
          { day:'Tue', topic:'Thiết kế responsive: Mobile và Desktop', description:'Adapt design từ mobile lên desktop, responsive breakpoints.' },
          { day:'Wed', topic:'Handoff: Chuẩn bị file cho developer', description:'Export assets, viết annotation và dùng Figma Dev Mode.' },
          { day:'Thu', topic:'Xây dựng portfolio Behance/Dribbble', description:'Trình bày dự án đẹp, viết case study ngắn gọn.' },
          { day:'Fri', topic:'Hoàn thiện dự án portfolio cuối khoá', description:'Hoàn chỉnh 1 dự án thiết kế app hoàn chỉnh để portfolio.' },
        ]},
      ],
    },
    intermediate: {
      title: 'Lộ trình UI/UX chuyên nghiệp (3 tuần)',
      total_weeks: 3,
      weeks: [
        { week: 1, theme: 'Advanced Figma & Design System', tasks: [
          { day:'Mon', topic:'Figma Advanced: Variables và Tokens', description:'Dùng Figma Variables cho color token, spacing token và dark mode.' },
          { day:'Tue', topic:'Component: Variants và interactive states', description:'Tạo component với đầy đủ state: default, hover, active, disabled.' },
          { day:'Wed', topic:'Design System: Atomic Design methodology', description:'Tổ chức design system theo atoms, molecules, organisms.' },
          { day:'Thu', topic:'Animation: Micro-interaction trong UI', description:'Thiết kế micro-animation cho button, loading, transition.' },
          { day:'Fri', topic:'Thực hành: Xây dựng mini design system', description:'Tạo design system cho 1 project với 20+ component.' },
        ]},
        { week: 2, theme: 'UX Research chuyên sâu', tasks: [
          { day:'Mon', topic:'User interview: Kỹ thuật phỏng vấn UX', description:'Chuẩn bị câu hỏi, phỏng vấn 3 người và synthesis insight.' },
          { day:'Tue', topic:'Information Architecture & Card Sorting', description:'Thiết kế cấu trúc thông tin, tổ chức navigation logic.' },
          { day:'Wed', topic:'Accessibility: WCAG và inclusive design', description:'Đảm bảo contrast ratio, keyboard navigation và screen reader.' },
          { day:'Thu', topic:'A/B Testing: Thiết kế experiment', description:'Thiết kế và phân tích A/B test cho landing page hoặc onboarding.' },
          { day:'Fri', topic:'Metrics: Đo lường UX bằng số liệu', description:'Dùng task completion rate, SUS score và NPS để đánh giá UX.' },
        ]},
        { week: 3, theme: 'Portfolio & Career', tasks: [
          { day:'Mon', topic:'Case study: Viết process design chuyên nghiệp', description:'Viết case study dài 800 từ theo format Problem-Process-Solution.' },
          { day:'Tue', topic:'Redesign dự án thực tế', description:'Chọn 1 app phổ biến, phân tích UX và đề xuất cải thiện.' },
          { day:'Wed', topic:'Collaboration: Làm việc với Developer', description:'Kỹ năng handoff, viết spec và giao tiếp với dev team.' },
          { day:'Thu', topic:'Hoàn thiện portfolio 3 dự án', description:'Đánh bóng 3 case study, upload Behance và cập nhật LinkedIn.' },
          { day:'Fri', topic:'Career roadmap: Junior → Mid UX Designer', description:'Lên kế hoạch phát triển sự nghiệp, tìm internship và job.' },
        ]},
      ],
    },
    advanced: {
      title: 'Lộ trình Senior UI/UX Designer (2 tuần)',
      total_weeks: 2,
      weeks: [
        { week: 1, theme: 'Strategic Design & Leadership', tasks: [
          { day:'Mon', topic:'Product Thinking: Design meets Business', description:'Hiểu business metrics, OKR và cách design tác động đến KPI.' },
          { day:'Tue', topic:'Design Sprint: 5 ngày giải quyết vấn đề', description:'Áp dụng Google Design Sprint framework vào dự án thực tế.' },
          { day:'Wed', topic:'Systems Thinking trong Product Design', description:'Thiết kế hệ thống phức tạp, xử lý edge case và error state.' },
          { day:'Thu', topic:'Stakeholder Management: Thuyết phục và present', description:'Kỹ năng present design, xử lý feedback và negotiate.' },
          { day:'Fri', topic:'Mentoring: Hướng dẫn junior designer', description:'Cách cho feedback constructive, code review design và growth.' },
        ]},
        { week: 2, theme: 'Future Skills & Personal Brand', tasks: [
          { day:'Mon', topic:'AI trong Design: Figma AI, Midjourney, v0', description:'Dùng AI tools tăng tốc workflow: generate, ideate và prototype.' },
          { day:'Tue', topic:'Motion Design: After Effects cơ bản cho UI', description:'Tạo motion spec, animated prototype và UI animation.' },
          { day:'Wed', topic:'Nâng cao portfolio: Telling a compelling story', description:'Viết case study thuyết phục, video walkthrough và presentation.' },
          { day:'Thu', topic:'Personal brand: Thought leadership', description:'Viết bài chia sẻ kiến thức, speak tại event và build community.' },
          { day:'Fri', topic:'Chiến lược tìm việc Senior/Lead Designer', description:'Chuẩn bị cho vòng phỏng vấn Senior, portfolio review và offer.' },
        ]},
      ],
    },
  },
};

// ── Hàm điều chỉnh duration_min theo thời gian học của user ──────────────────
function applyDuration(template, durationMin) {
  const result = JSON.parse(JSON.stringify(template));
  for (const week of result.weeks) {
    for (const task of week.tasks) {
      task.duration_min = durationMin;
      task.resources = [];
    }
  }
  return result;
}

// ── Map level string về key đơn giản ─────────────────────────────────────────
function normalizeLevel(level) {
  if (!level) return 'beginner';
  const l = level.toLowerCase();
  if (l.includes('mới') || l.includes('beginner') || l.includes('zero')) return 'beginner';
  if (l.includes('nâng') || l.includes('advanced') || l.includes('expert') || l.includes('chuyên')) return 'advanced';
  return 'intermediate';
}

// ── Hàm chính — thay thế hoàn toàn generateRoadmap cũ ───────────────────────
async function generateRoadmap(goal, level, hoursPerDay) {
  const goalKey = GOAL_TAG_MAP[goal] ? goal : 'programming';
  const levelKey = normalizeLevel(level);

  const timeMap = { '15-30': 0.5, '1-2h': 1.5, '3h+': 3 };
  const hours = timeMap[hoursPerDay] || parseFloat(hoursPerDay) || 1.5;
  const durationMin = Math.round(hours * 60);

  const template = TEMPLATES[goalKey]?.[levelKey] || TEMPLATES.programming.beginner;
  const roadmap = applyDuration(template, durationMin);

  // Gắn tài liệu từ DB nếu có
  for (const week of roadmap.weeks) {
    for (const task of week.tasks) {
      const tag = findTagFromTopic(task.topic, goalKey);
      if (tag) {
        task.resources = await getResourcesFromDB(tag, 2);
        task.resource_tag = tag;
      }
    }
  }

  return roadmap;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function findTagFromTopic(topic, goal) {
  const goalData = GOAL_TAG_MAP[goal];
  if (!goalData) return null;
  const topicLower = topic.toLowerCase();
  for (const [keyword, tag] of Object.entries(goalData.topicTagMap)) {
    if (topicLower.includes(keyword)) return tag;
  }
  return goalData.tags[0];
}

async function getResourcesFromDB(tag, limit = 2) {
  try {
    const { data } = await supabase.from('resources').select('title, url, type').eq('tag', tag).limit(limit);
    return data || [];
  } catch { return []; }
}

async function getRandomResourcesForGoal(goal, limit = 3) {
  const goalData = GOAL_TAG_MAP[goal];
  if (!goalData) return [];
  try {
    const { data } = await supabase.from('resources').select('title, url, type, tag').in('tag', goalData.tags).limit(limit * 3);
    if (!data || data.length === 0) return [];
    return data.sort(() => Math.random() - 0.5).slice(0, limit);
  } catch { return []; }
}

async function suggestResources(topic, level, goal) {
  const tag = goal ? findTagFromTopic(topic, goal) : null;
  const dbResults = tag ? await getResourcesFromDB(tag, 4) : [];
  return dbResults.map(r => ({ ...r, reason: `Tài liệu phù hợp với chủ đề "${topic}"` }));
}

module.exports = { generateRoadmap, suggestResources, getRandomResourcesForGoal, findTagFromTopic, GOAL_TAG_MAP };