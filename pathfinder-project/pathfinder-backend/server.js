require('dotenv').config({ path: __dirname + '/.env' });

const path = require('path');
const express = require('express');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');
const supabase = require('./lib/supabase');

const app = express();

app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'pathfinder_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.redirect('/login');
  next();
}

async function getCurrentRoadmapId(userId) {
  const { data } = await supabase
    .from('roadmaps')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id || null;
}

function normalizeDay(day) {
  const map = {
    Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat',
    MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat',
    T2: 'Mon', T3: 'Tue', T4: 'Wed', T5: 'Thu', T6: 'Fri', T7: 'Sat',
    'Thứ 2': 'Mon', 'Thứ 3': 'Tue', 'Thứ 4': 'Wed',
    'Thứ 5': 'Thu', 'Thứ 6': 'Fri', 'Thứ 7': 'Sat',
  };

  return map[day] || day;
}

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_LABELS = {
  Mon: 'Thứ 2',
  Tue: 'Thứ 3',
  Wed: 'Thứ 4',
  Thu: 'Thứ 5',
  Fri: 'Thứ 6',
  Sat: 'Thứ 7',
};

function dayIndex(day) {
  const index = DAY_ORDER.indexOf(normalizeDay(day));
  return index === -1 ? 999 : index;
}

function sortTasksByWeekAndDay(tasks) {
  return (tasks || []).sort((a, b) => {
    const weekA = Number(a.week_number) || 0;
    const weekB = Number(b.week_number) || 0;

    if (weekA !== weekB) return weekA - weekB;

    const dayA = dayIndex(a.day_label);
    const dayB = dayIndex(b.day_label);

    if (dayA !== dayB) return dayA - dayB;

    return String(a.topic || '').localeCompare(String(b.topic || ''));
  });
}

app.use('/auth', require('./routes/auth'));
app.use('/api/roadmap', require('./routes/roadmap'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/auto-complete', require('./routes/autocomplete'));

app.get('/', (req, res) => {
  res.render('landing', {
    currentPath: '/',
    user: req.session?.user || null,
    showChatbox: false,
  });
});

app.get('/about', (req, res) => {
  res.render('about', {
    currentPath: '/about',
    user: req.session?.user || null,
    showChatbox: false,
  });
});

app.get('/login', (req, res) => {
  if (req.session?.user) return res.redirect('/dashboard');

  res.render('login', {
    currentPath: '/login',
    error: null,
    user: null,
    showChatbox: false,
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/onboarding', requireAuth, (req, res) => {
  res.render('onboarding', {
    currentPath: '/onboarding',
    user: req.session.user,
    showChatbox: false,
  });
});

app.get('/dashboard', requireAuth, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const roadmapId = await getCurrentRoadmapId(userId);
    if (!roadmapId) return res.redirect('/onboarding');

    const todayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

    const { data: rawTodayTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('roadmap_id', roadmapId);

    const todayTasks = sortTasksByWeekAndDay(rawTodayTasks || [])
      .filter(t => normalizeDay(t.day_label) === todayLabel);

    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id, is_completed')
      .eq('roadmap_id', roadmapId);

    const total = allTasks?.length || 0;
    const done = allTasks?.filter(t => t.is_completed).length || 0;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    const { data: roadmap } = await supabase
      .from('roadmaps')
      .select('title, goal, total_weeks')
      .eq('id', roadmapId)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, goal, level')
      .eq('id', userId)
      .maybeSingle();

    res.render('index', {
      currentPath: '/dashboard',
      user: req.session.user,
      profile: profile || {},
      roadmap: roadmap || {},
      roadmapId,
      todayTasks,
      total,
      done,
      percent,
      streak: 0,
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('index', {
      currentPath: '/dashboard',
      user: req.session.user,
      profile: {},
      roadmap: {},
      roadmapId: null,
      todayTasks: [],
      total: 0,
      done: 0,
      percent: 0,
      streak: 0,
    });
  }
});

app.get('/roadmap', requireAuth, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const roadmapId = await getCurrentRoadmapId(userId);
    if (!roadmapId) return res.redirect('/onboarding');

    const { data: roadmap } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('id', roadmapId)
      .single();

    const { data: rawTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('roadmap_id', roadmapId)
      .order('week_number', { ascending: true });

    const tasks = sortTasksByWeekAndDay(rawTasks || []);
    const activeTask = tasks.find(t => !t.is_completed);

    const weekMap = {};

    for (const task of tasks) {
      if (!weekMap[task.week_number]) {
        weekMap[task.week_number] = {
          week: task.week_number,
          theme: task.week_theme || `Tuần ${task.week_number}`,
          tasks: [],
        };
      }

      const normalizedDay = normalizeDay(task.day_label);

      weekMap[task.week_number].tasks.push({
        ...task,
        normalized_day: normalizedDay,
        day_text: DAY_LABELS[normalizedDay] || task.day_label,
        status: task.is_completed
          ? 'done'
          : activeTask && activeTask.id === task.id
            ? 'progress'
            : 'unlearned',
      });
    }

    const weeks = Object.values(weekMap).sort((a, b) => Number(a.week) - Number(b.week));
    const total = tasks.length;
    const done = tasks.filter(t => t.is_completed).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    res.render('roadmap', {
      currentPath: '/roadmap',
      user: req.session.user,
      roadmap: roadmap || {},
      roadmapId,
      weeks,
      total,
      done,
      percent,
    });

  } catch (err) {
    console.error('Roadmap error:', err);
    res.render('roadmap', {
      currentPath: '/roadmap',
      user: req.session.user,
      roadmap: {},
      roadmapId: null,
      weeks: [],
      total: 0,
      done: 0,
      percent: 0,
    });
  }
});

app.get('/schedule', requireAuth, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const roadmapId = await getCurrentRoadmapId(userId);
    if (!roadmapId) return res.redirect('/onboarding');

    const { data: roadmap } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('id', roadmapId)
      .single();

    const { data: rawTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('roadmap_id', roadmapId)
      .order('week_number', { ascending: true });

    const allTasks = sortTasksByWeekAndDay(rawTasks || []);

    const maxWeekFromTasks = allTasks.length > 0
      ? Math.max(...allTasks.map(t => Number(t.week_number) || 1))
      : 1;

    const totalWeeks = Number(roadmap?.total_weeks) || maxWeekFromTasks || 1;
    const requestedWeek = Number(req.query.week);
    const currentWeek = requestedWeek >= 1 && requestedWeek <= totalWeeks ? requestedWeek : 1;

    const weekTasks = allTasks.filter(t => Number(t.week_number) === currentWeek);

    const schedule = DAY_ORDER.map(day => ({
      day,
      label: DAY_LABELS[day],
      tasks: weekTasks.filter(t => normalizeDay(t.day_label) === day),
    }));

    const todayLabel = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

    res.render('schedule', {
      currentPath: '/schedule',
      user: req.session.user,
      roadmapId,
      schedule,
      currentWeek,
      totalWeeks,
      todayLabel,
      roadmapTitle: roadmap?.title || '',
    });

  } catch (err) {
    console.error('Schedule error:', err);
    res.render('schedule', {
      currentPath: '/schedule',
      user: req.session.user,
      roadmapId: null,
      schedule: [],
      currentWeek: 1,
      totalWeeks: 1,
      todayLabel: 'Mon',
      roadmapTitle: '',
    });
  }
});

app.get('/lesson/:task_id', requireAuth, async (req, res) => {
  try {
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', req.params.task_id)
      .single();

    if (!task) return res.redirect('/dashboard');

    const { data: roadmap } = await supabase
      .from('roadmaps')
      .select('id, title, goal')
      .eq('id', task.roadmap_id)
      .single();

    const { data: rawSiblingTasks } = await supabase
      .from('tasks')
      .select('id, topic, week_number, day_label')
      .eq('roadmap_id', task.roadmap_id)
      .order('week_number', { ascending: true });

    const siblingTasks = sortTasksByWeekAndDay(rawSiblingTasks || []);
    const idx = siblingTasks.findIndex(t => t.id === task.id);

    const prevTask = idx > 0 ? siblingTasks[idx - 1] : null;
    const nextTask = idx >= 0 && idx < siblingTasks.length - 1 ? siblingTasks[idx + 1] : null;

    const normalizedDay = normalizeDay(task.day_label);

    res.render('lesson', {
      currentPath: '/lesson',
      user: req.session.user,
      task,
      dayLabel: DAY_LABELS[normalizedDay] || task.day_label,
      prevTask,
      nextTask,
      roadmapId: task.roadmap_id,
      roadmap: roadmap || {},
    });

  } catch (err) {
    console.error('Lesson error:', err);
    res.redirect('/dashboard');
  }
});

app.get('/profile', requireAuth, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const roadmapId = await getCurrentRoadmapId(userId);

    const { data: allTasks } = roadmapId ? await supabase
      .from('tasks')
      .select('id, is_completed, completed_at, week_number')
      .eq('roadmap_id', roadmapId) : { data: [] };

    const total = allTasks?.length || 0;
    const done = allTasks?.filter(t => t.is_completed).length || 0;

    const { data: roadmap } = roadmapId ? await supabase
      .from('roadmaps')
      .select('title, goal, total_weeks, created_at')
      .eq('id', roadmapId)
      .single() : { data: null };

    res.render('profile', {
      currentPath: '/profile',
      user: req.session.user,
      profile: profile || { full_name: req.session.user.email },
      roadmap: roadmap || {},
      stats: {
        total,
        done,
        percent: total > 0 ? Math.round(done / total * 100) : 0,
      },
    });

  } catch (err) {
    console.error('Profile error:', err);
    res.render('profile', {
      currentPath: '/profile',
      user: req.session.user,
      profile: {},
      roadmap: {},
      stats: { total: 0, done: 0, percent: 0 },
    });
  }
});

app.get('/settings', requireAuth, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    res.render('settings', {
      currentPath: '/settings',
      user: req.session.user,
      profile: profile || {},
    });

  } catch (err) {
    console.error('Settings error:', err);
    res.render('settings', {
      currentPath: '/settings',
      user: req.session.user,
      profile: {},
    });
  }
});

app.post('/api/settings/profile', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const { full_name, headline } = req.body;

  if (!full_name) {
    return res.status(400).json({
      success: false,
      error: 'Tên không được để trống.',
    });
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name,
        headline,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.post('/api/settings/password', requireAuth, async (req, res) => {
  const { new_password, confirm_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Mật khẩu phải có ít nhất 6 ký tự.',
    });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      error: 'Mật khẩu xác nhận không khớp.',
    });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const accessToken = req.session.user.access_token;

    if (!supabaseUrl || !supabaseKey || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Không đủ thông tin phiên đăng nhập để đổi mật khẩu.',
      });
    }

    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const { error } = await userSupabase.auth.updateUser({
      password: new_password,
    });

    if (error) throw error;

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});