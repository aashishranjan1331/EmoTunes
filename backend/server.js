import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import moodRoutes from './routes/moodRoutes.js';
import requireAuth from './middleware/requireAuth.js';
   import passwordRoutes from './routes/passwordRoutes.js';
  
const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Set JWT_SECRET in backend/.env to a random secret of at least 32 characters.');
  process.exit(1);
}

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'EmoTunes API' }));
app.use('/api/auth', authRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/auth', passwordRoutes);
// Example protected endpoint: send the JWT as Authorization: Bearer <token>
app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({ user: { id: req.user.sub, email: req.user.email } });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Unexpected server error.' });
});

try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/emotunes');
  console.log('Connected to MongoDB');
  app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "EmoTunes Backend Server Running!"
    });
});
  app.listen(PORT, () => console.log(`EmoTunes API running at http://localhost:${PORT}`));
} catch (error) {
  console.error('Could not connect to MongoDB:', error.message);
  process.exit(1);
}
