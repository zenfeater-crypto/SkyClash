import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const distPath = path.resolve(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

app.use(express.json());

// Cloud Run readiness & liveness health check endpoints
app.get(['/healthz', '/health', '/_health'], (req, res) => {
  res.status(200).send('OK');
});

// Trusted server time endpoint
app.get('/api/time', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({ serverTime: Date.now() });
});

// Serve static assets from Vite build output if present
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// SPA fallback: return index.html for all page routes
app.get('*', (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        res.status(200).send('<!DOCTYPE html><html><head><title>Skyblock Value Calculator</title></head><body><div id="root">Loading Skyblock Value Calculator...</div></body></html>');
      }
    });
  } else {
    res.status(200).send('<!DOCTYPE html><html><head><title>Skyblock Value Calculator</title></head><body><div id="root">Loading Skyblock Value Calculator...</div></body></html>');
  }
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT} (0.0.0.0:${PORT})`);
});

server.on('error', (err: any) => {
  console.error('HTTP server encountered an error:', err);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

