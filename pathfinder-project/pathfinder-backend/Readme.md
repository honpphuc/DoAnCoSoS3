# Pathfinder AI

Pathfinder AI là ứng dụng web hỗ trợ người học xây dựng lộ trình học tập cá nhân hóa, theo dõi tiến độ và quản lý các nhiệm vụ học tập. Giao diện được render bằng EJS; backend sử dụng Node.js và Express, lưu trữ dữ liệu và xác thực qua Supabase.

## Yêu cầu

- Node.js 18 trở lên và npm.
- Một dự án Supabase để sử dụng đăng nhập và các chức năng lưu dữ liệu.
- Gemini API key nếu muốn bật các chức năng chat AI.

## Cài đặt và chạy

Mở terminal tại thư mục gốc của repository, sau đó chạy:

```bash
cd pathfinder-backend
npm ci
cp .env.example .env
```

Điền thông tin dịch vụ vào file `pathfinder-backend/.env` theo bảng cấu hình bên dưới. Sau đó khởi động ở chế độ phát triển:

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để truy cập ứng dụng. Dừng server bằng `Ctrl+C` trong terminal.

Để chạy mà không tự khởi động lại khi có thay đổi mã nguồn, dùng `npm start` thay cho `npm run dev`.

## Cấu hình môi trường

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `SUPABASE_URL` | Có cho đăng nhập và dữ liệu | Project URL trong phần API của Supabase. |
| `SUPABASE_KEY` | Có cho đăng nhập và dữ liệu | Khóa public/anon của dự án Supabase. Không dùng service role key ở môi trường client. |
| `SESSION_SECRET` | Khuyến nghị | Chuỗi bí mật dùng để ký session; hãy thay giá trị mẫu bằng chuỗi ngẫu nhiên dài. |
| `GEMINI_API_KEY` | Không | API key để bật tính năng chat AI. |
| `PORT` | Không | Cổng chạy server; mặc định là `3000`. |

Nếu chưa cấu hình Supabase, server vẫn có thể khởi động để xem giao diện, nhưng các chức năng cần xác thực hoặc truy cập dữ liệu sẽ không dùng được. Tài khoản Supabase cần được cấu hình với các bảng mà ứng dụng sử dụng, gồm `profiles`, `roadmaps` và `tasks`.

## Chức năng chính

- Đăng ký, đăng nhập và quản lý hồ sơ người học.
- Tạo lộ trình, xem kế hoạch theo tuần và theo dõi nhiệm vụ học tập.
- Quản lý lịch học, tài nguyên học tập và tiến độ.
- Chat AI tùy chọn thông qua Gemini.

## Cấu trúc thư mục

```text
pathfinder-project/
├── pathfinder-backend/
│   ├── lib/                 # Kết nối Supabase và dữ liệu lộ trình
│   ├── routes/              # API và xử lý xác thực
│   ├── server.js            # Express server và các trang web
│   ├── package.json         # Scripts và dependencies
│   └── .env.example         # Mẫu biến môi trường
├── routes/                  # Các route giao diện
└── views/                   # Các trang và partial EJS
```

## Scripts

| Lệnh | Tác dụng |
| --- | --- |
| `npm run dev` | Chạy server bằng nodemon. |
| `npm start` | Chạy server bằng Node.js. |
