require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 3000;

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI is required (set in .env or environment)');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });

app.listen(PORT, () => console.log(`🚀 Sendo API running on port ${PORT}`));
