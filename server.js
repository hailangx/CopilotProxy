require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json({ limit: '50mb' }));

// ---- Logging middleware ----
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ---- Config ----
const PORT = process.env.PORT || 8080;

// ---- Health check ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Route modules ----
app.use(require('./routes/models'));     // GET  /v1/models
app.use(require('./routes/openai'));     // POST /v1/chat/completions
app.use(require('./routes/anthropic')); // POST /v1/messages, /v1/auth, count_tokens

// ---- Catch-all for unknown routes ----
app.all('*', (req, res) => {
  console.log(`[UNHANDLED] ${req.method} ${req.url} - Body: ${JSON.stringify(req.body).slice(0, 200)}`);
  res.json({ status: 'ok' });
});

// ---- Start ----
app.listen(PORT, () => {
  const { GITHUB_API_URL } = require('./lib/proxy');
  console.log(`GitHub Models API Proxy running on http://localhost:${PORT}`);
  console.log(`Target API: ${GITHUB_API_URL}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /v1/chat/completions - OpenAI-compatible (any app)`);
  console.log(`  POST /v1/messages         - Anthropic-compatible (Claude Code)`);
  console.log(`  GET  /v1/models           - List available models`);
  console.log(`  GET  /health              - Health check`);
  console.log(`\nUsage:`);
  console.log(`  OpenAI-compatible apps:  OPENAI_BASE_URL=http://localhost:${PORT}/v1`);
  console.log(`  Claude Code:             ANTHROPIC_BASE_URL=http://localhost:${PORT}`);
});
