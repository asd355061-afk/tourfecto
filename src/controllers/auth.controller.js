const jwt = require('jsonwebtoken');
const db = require('../db');
const { hashPassword, comparePassword } = require('../utils/hash');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

// POST /api/auth/register
// body: { name, email, password, role ('customer' أو 'vendor'), businessName? }
async function register(req, res) {
  const { name, email, password, role, businessName } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }
  const finalRole = role === 'vendor' ? 'vendor' : 'customer';
  if (finalRole === 'vendor' && !businessName) {
    return res.status(400).json({ error: 'اسم النشاط التجاري مطلوب لحسابات الموردين' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل' });
  }

  const password_hash = await hashPassword(password);
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  const info = insertUser.run(name, email.toLowerCase(), password_hash, finalRole);
  const userId = info.lastInsertRowid;

  if (finalRole === 'vendor') {
    db.prepare(
      'INSERT INTO vendor_profiles (user_id, business_name, plan) VALUES (?, ?, ?)'
    ).run(userId, businessName, 'basic');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
}

// POST /api/auth/login
// body: { email, password }
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
}

// GET /api/auth/me  (يتطلب توكن)
function me(req, res) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  let vendorProfile = null;
  if (user.role === 'vendor') {
    vendorProfile = db.prepare('SELECT * FROM vendor_profiles WHERE user_id = ?').get(user.id);
  }
  res.json({ user: publicUser(user), vendorProfile });
}

module.exports = { register, login, me };
