import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import visionRouter from './routes/vision.js';
import recipesRouter from './routes/recipes.js';
import pantryRouter from './routes/pantry.js';
import shoppingRouter from './routes/shopping.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Security & parsing middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:8081', 'http://localhost:19006'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // Large enough for base64 images
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// API Routes
app.use('/api/vision', visionRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/pantry', pantryRouter);
app.use('/api/shopping', shoppingRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 PantryIQ API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
