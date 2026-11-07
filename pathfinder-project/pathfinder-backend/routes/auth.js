const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../lib/supabase');

// Helper: Tạo Supabase client với user token (để RLS nhận auth.uid())
function createUserClient(accessToken) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY ||
              process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// POST /auth/login
// Form trong login.ejs gửi lên: email, password
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', {
      currentPath: '/login',
      error: 'Vui lòng nhập đầy đủ email và mật khẩu.',
    });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('Login Supabase error:', error.message);
      return res.render('login', {
        currentPath: '/login',
        error: 'Email hoặc mật khẩu không đúng.',
      });
    }

    // Lưu session
    req.session.user = {
      id: data.user.id,
      email: data.user.email,
      access_token: data.session.access_token,
    };

    // Tạo client với JWT của user để RLS cho phép query
    const userClient = createUserClient(data.session.access_token);

    const { data: profile } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    req.session.profile = profile || null;

    const { data: roadmap } = await userClient
      .from('roadmaps')
      .select('id')
      .eq('user_id', data.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (roadmap?.id) {
      return res.redirect('/dashboard');
    }

    return res.redirect('/onboarding');

  } catch (err) {
    console.error('Login error:', err);
    res.render('login', {
      currentPath: '/login',
      error: 'Có lỗi xảy ra, vui lòng thử lại.',
    });
  }
});

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, password_confirm, full_name } = req.body;

  if (!email || !password || !password_confirm || !full_name) {
    return res.render('login', { error: 'Vui lòng nhập đầy đủ thông tin.' });
  }

  if (password !== password_confirm) {
    return res.render('login', { error: 'Mật khẩu không khớp.' });
  }

  if (password.length < 6) {
    return res.render('login', { error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }

  try {
    console.log('Attempting signup with email:', email);
    
    // Truyền full_name vào user_metadata → trigger on_auth_user_created sẽ đọc
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name,
        },
      },
    });

    console.log('Supabase signUp response - error:', error, 'data:', {
      userId: data?.user?.id,
      hasSession: !!data?.session,
      identities: data?.user?.identities?.length,
    });

    // Nếu có lỗi thực sự → báo lỗi
    if (error) {
      console.error('Supabase signUp error:', error);
      return res.render('login', { error: error.message || 'Đăng ký thất bại. Vui lòng thử lại.' });
    }

    // Kiểm tra: nếu user tồn tại nhưng không có identities → email đã được sử dụng
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      return res.render('login', {
        error: 'Email này đã được đăng ký. Vui lòng đăng nhập.',
      });
    }

    // Nếu user null hoặc không có session → đang chờ xác nhận email
    if (!data?.user?.id || !data?.session) {
      console.log('User registered but awaiting email confirmation');
      return res.render('login', { 
        error: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.',
        isSuccess: true 
      });
    }

    // Profile được tạo tự động bởi database trigger (on_auth_user_created)
    // Không cần insert thủ công từ server nữa

    req.session.user = {
      id: data.user.id,
      email: data.user.email,
      access_token: data.session?.access_token,
    };

    // Chuyển sang onboarding để thiết lập lộ trình
    res.redirect('/onboarding');

  } catch (err) {
    console.error('Register error:', err);
    res.render('login', { error: 'Đăng ký thất bại, vui lòng thử lại.' });
  }
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
