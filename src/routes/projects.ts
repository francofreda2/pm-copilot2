import express from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-dev';

// Middleware to authenticate
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.use(authenticate);

// Get all projects for user
router.get('/', async (req: any, res) => {
  try {
    const db = getDb();
    const projects = await db.all('SELECT id, name, data, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC', [req.user.userId]);
    res.json(projects.map(p => JSON.parse(p.data)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save or update project
router.post('/', async (req: any, res) => {
  const projectData = req.body;
  if (!projectData || !projectData.id) return res.status(400).json({ error: 'Invalid project data' });

  try {
    const db = getDb();
    const existing = await db.get('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectData.id, req.user.userId]);
    
    if (existing) {
      await db.run('UPDATE projects SET name = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', 
        [projectData.name || 'Sin Nombre', JSON.stringify(projectData), projectData.id, req.user.userId]);
    } else {
      await db.run('INSERT INTO projects (id, user_id, name, data) VALUES (?, ?, ?, ?)', 
        [projectData.id, req.user.userId, projectData.name || 'Sin Nombre', JSON.stringify(projectData)]);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete project
router.delete('/:id', async (req: any, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
