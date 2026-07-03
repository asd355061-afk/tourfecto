require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth.routes');
const placesRoutes = require('./src/routes/places.routes');
const vendorRoutes = require('./src/routes/vendor.routes');

const app = express();

// الدومينات المسموح لها تكلم الـ API. بيتقروا من متغير بيئة CORS_ORIGIN
// (تقدر تحط أكتر من دومين مفصولين بفاصلة). لو المتغير مش موجود، بيرجع
// افتراضيًا لدومين الفرونت إند الحالي على Hostinger + رابط الباك إند نفسه.
const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  'https://mediumvioletred-gnat-430087.hostingersite.com,https://tourfecto.onrender.com'
)
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // طلبات من أدوات زي curl/Postman مبيبقاش معاها origin أصلاً
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('غير مسموح بهذا الأصل (CORS): ' + origin));
    },
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'tourfecto-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/vendor', vendorRoutes);

// معالج الأخطاء العام
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'حدث خطأ غير متوقع في السيرفر' });
});

// مسار غير موجود
app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Tourfecto API is running on http://localhost:${PORT}`);
});