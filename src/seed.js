// تشغيل: npm run seed
// يعبّئ قاعدة البيانات ببيانات تجريبية (مورد تجريبي + 8 أماكن + تقييمات)
require('dotenv').config();
const db = require('./db');
const { hashPassword } = require('./utils/hash');

async function seed() {
  console.log('بدء تعبئة البيانات التجريبية...');

  // امسح البيانات القديمة (تجريبي فقط، لا تستخدمها في بيئة إنتاج فيها بيانات حقيقية)
  db.exec('DELETE FROM reviews; DELETE FROM place_views; DELETE FROM places; DELETE FROM vendor_profiles; DELETE FROM users;');

  const demoVendorPass = await hashPassword('vendor123');
  const demoCustomerPass = await hashPassword('customer123');

  const vendor = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run('شركة السياحة النموذجية', 'vendor@tourfecto.demo', demoVendorPass, 'vendor');
  db.prepare('INSERT INTO vendor_profiles (user_id, business_name, plan) VALUES (?, ?, ?)').run(
    vendor.lastInsertRowid,
    'Tourfecto Demo Vendor',
    'pro'
  );

  const customer = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run('عميل تجريبي', 'customer@tourfecto.demo', demoCustomerPass, 'customer');

  const places = [
    ['hotel', 'شرم الشيخ', 'منتجع لؤلؤة البحر الأحمر', 'منتجع شاطئي فاخر بإطلالة مباشرة على الشعاب المرجانية.', 120, '🏖️'],
    ['restaurant', 'القاهرة', 'مطعم النيل الذهبي', 'مأكولات مصرية أصيلة على ضفاف النيل بأجواء ساحرة.', 18, '🍽️'],
    ['attraction', 'الأقصر', 'معبد الكرنك', 'أحد أعظم المجمعات المعبدية في العالم القديم.', 15, '🏛️'],
    ['hotel', 'اسطنبول', 'فندق البوسفور الملكي', 'إطلالة خلابة على مضيق البوسفور من قلب المدينة.', 95, '🏨'],
    ['attraction', 'دبي', 'برج خليفة', 'أطول برج في العالم مع إطلالة بانورامية على المدينة.', 40, '🌆'],
    ['restaurant', 'مراكش', 'رياض الطعم المغربي', 'تجربة طعام تقليدية داخل رياض عتيق بقلب المدينة القديمة.', 25, '🍲'],
    ['hotel', 'برشلونة', 'فندق سواحل المتوسط', 'على بعد خطوات من الشاطئ وأشهر معالم المدينة.', 140, '🏨'],
    ['attraction', 'باريس', 'برج إيفل', 'رمز مدينة النور الذي لا يمكن تفويت زيارته.', 28, '🗼'],
  ];

  const insertPlace = db.prepare(
    'INSERT INTO places (vendor_id, category, city, name, description, price, icon) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const placeIds = places.map(
    (p) => insertPlace.run(vendor.lastInsertRowid, ...p).lastInsertRowid
  );

  const insertReview = db.prepare(
    'INSERT INTO reviews (place_id, user_id, rating, title, body) VALUES (?, ?, ?, ?, ?)'
  );
  insertReview.run(placeIds[0], customer.lastInsertRowid, 5, 'إطلالة تخطف الأنفاس', 'من أفضل المنتجعات اللي زرتها، الغوص في الشعاب المرجانية تجربة لا تُنسى.');
  insertReview.run(placeIds[2], customer.lastInsertRowid, 5, 'تجربة تاريخية مهيبة', 'المكان ضخم ومليء بالتفاصيل، لازم دليل سياحي عشان تفهم القصة كاملة.');
  insertReview.run(placeIds[4], customer.lastInsertRowid, 5, 'إطلالة من قمة العالم', 'الصعود للطابق العلوي في الغروب تجربة عمرها ما تتنسى.');

  console.log('تم بنجاح ✅');
  console.log('حساب مورد تجريبي:  vendor@tourfecto.demo   / vendor123');
  console.log('حساب عميل تجريبي:  customer@tourfecto.demo / customer123');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
