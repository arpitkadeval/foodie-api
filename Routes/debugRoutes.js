import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

router.get('/uploads', (req, res) => {
  const uploadsDir = path.join(process.cwd(), 'backend', 'uploads');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to read uploads directory', error: err.message });
    }
    res.json({ files });
  });
});

export default router;
