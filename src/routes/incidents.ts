import express from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-dev';

const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
};

router.use(authenticate);

router.get('/', async (req: any, res) => {
  try {
    const db = getDb();
    const rows = await db.all('SELECT data FROM incidents WHERE user_id = ? ORDER BY updated_at DESC', [req.user.userId]);
    res.json(rows.map((r: any) => JSON.parse(r.data)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req: any, res) => {
  const data = req.body;
  if (!data?.id) return res.status(400).json({ error: 'Invalid data' });
  try {
    const db = getDb();
    const existing = await db.get('SELECT id FROM incidents WHERE id = ? AND user_id = ?', [data.id, req.user.userId]);
    if (existing) {
      await db.run('UPDATE incidents SET title = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [data.title || 'Sin Título', JSON.stringify(data), data.id, req.user.userId]);
    } else {
      await db.run('INSERT INTO incidents (id, user_id, title, data) VALUES (?, ?, ?, ?)',
        [data.id, req.user.userId, data.title || 'Sin Título', JSON.stringify(data)]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: any, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM incidents WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
