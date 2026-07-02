const jwt = require('jsonwebtoken');

// يتحقق من وجود توكن JWT صالح ويربط بيانات المستخدم بالطلب (req.user)
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول للوصول لهذا المورد' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, email, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'جلسة غير صالحة أو منتهية، رجاءً سجّل الدخول مرة أخرى' });
  }
}

// يسمح فقط للأدوار المحددة بالوصول (مثال: requireRole('vendor'))
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية للقيام بهذا الإجراء' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
