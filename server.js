require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth.routes');
const placesRoutes = require('./src/routes/places.routes');
const vendorRoutes = require('./src/routes/vendor.routes');

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
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
