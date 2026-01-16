import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import skillRoutes from './routes/skillRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import trashRoutes from './routes/trashRoutes.js';
import { cleanupExpiredTrash } from './services/trashService.js';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use('/api/skills', skillRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/trash', trashRoutes);

app.use('/uploads', express.static(join(__dirname, '../data/skills')));

cron.schedule('0 3 * * *', () => {
  console.log('Running trash cleanup...');
  cleanupExpiredTrash();
});

cleanupExpiredTrash();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
