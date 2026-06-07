const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

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
      return res.render('login', {
        currentPath: '/login',
        error: 'Email hoặc mật khẩu không đúng.',
      });
    }

    req.session.user = {
      id: data.user.id,
      email: data.user.email,
      access_token: data.session.access_token,
    };

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    req.session.profile = profile || null;

    const { data: roadmap } = await supabase
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
    const { data, error } = await supabase.auth.signUp({ email, password });

    console.log('Supabase signUp response - error:', error, 'data:', data);

    // Nếu có lỗi thực sự → báo lỗi
    if (error) {
      console.error('Supabase signUp error:', error);
      return res.render('login', { error: error.message || 'Đăng ký thất bại. Vui lòng thử lại.' });
    }

    // Nếu user null → đang chờ xác nhận email (bình thường nếu email confirmation enabled)
    if (!data?.user?.id) {
      console.log('User registered but awaiting email confirmation');
      return res.render('login', { 
        error: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.',
        isSuccess: true 
      });
    }

    // Nếu có user → tạo profile và đăng nhập luôn
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name,
    });

    if (profileError) {
      console.error('Profile insert error:', profileError);
    }

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
