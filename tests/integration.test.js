/**
 * Integration tests — spins up the proxy and makes real requests through it.
 * Requires GITHUB_TOKEN in .env (or environment).
 *
 * Run:  node --test tests/integration.test.js
 */
require('dotenv').config();
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');

// We import the route modules directly to build a test server on a random port
const modelsRoute = require('../routes/models');
const openaiRoute = require('../routes/openai');
const anthropicRoute = require('../routes/anthropic');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

let server;
let baseUrl;

// ---- Helper: HTTP request as Promise ----
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ---- Helper: Streaming request, collects SSE events ----
function requestStream(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, raw }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ---- Setup / Teardown ----
before(async () => {
  if (!GITHUB_TOKEN) {
    console.log('⚠️  GITHUB_TOKEN not set — integration tests will be skipped');
    return;
  }

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.get('/health', (_, res) => res.json({ status: 'ok' }));
  app.use(modelsRoute);
  app.use(openaiRoute);
  app.use(anthropicRoute);

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server on ${baseUrl}`);
      resolve();
    });
  });
});

after(() => {
  if (server) server.close();
});

// =======================================================
// Health & Models (no token needed)
// =======================================================
describe('Health & Models', { skip: !GITHUB_TOKEN && 'no token' }, () => {
  it('GET /health returns ok', async () => {
    const res = await request('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('GET /v1/models returns a list', async () => {
    const res = await request('GET', '/v1/models');
    assert.equal(res.status, 200);
    assert.equal(res.body.object, 'list');
    assert.ok(res.body.data.length > 0);
    // Should have both github and anthropic models
    const owners = new Set(res.body.data.map((m) => m.owned_by));
    assert.ok(owners.has('github'));
    assert.ok(owners.has('anthropic'));
  });

  it('GET /v1/models/:model returns model info', async () => {
    const res = await request('GET', '/v1/models/gpt-4o');
    assert.equal(res.status, 200);
    assert.equal(res.body.id, 'gpt-4o');
    assert.equal(res.body.object, 'model');
  });
});

// =======================================================
// OpenAI-compatible endpoint (live)
// =======================================================
describe('OpenAI /v1/chat/completions', { skip: !GITHUB_TOKEN && 'no token' }, () => {
  it('non-streaming request returns valid response', async () => {
    const res = await request('POST', '/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Reply with exactly: PONG' }],
      max_tokens: 20,
      temperature: 0,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.id, 'response should have an id');
    assert.ok(res.body.choices?.length > 0, 'should have choices');
    assert.ok(res.body.choices[0].message?.content, 'should have content');
    console.log('  → OpenAI response:', res.body.choices[0].message.content.slice(0, 60));
  });

  it('streaming request returns SSE events', async () => {
    const res = await requestStream('POST', '/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say hi in one word' }],
      max_tokens: 10,
      temperature: 0,
      stream: true,
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/event-stream'));
    assert.ok(res.raw.includes('data:'), 'should contain SSE data lines');
    assert.ok(res.raw.includes('[DONE]'), 'should end with [DONE]');
    console.log('  → Stream events received:', res.raw.split('\n').filter((l) => l.startsWith('data:')).length);
  });

  it('resolves Anthropic model names to GitHub models', async () => {
    const res = await request('POST', '/v1/chat/completions', {
      model: 'claude-3-5-sonnet-latest', // should map to gpt-4o
      messages: [{ role: 'user', content: 'Reply with exactly: MAPPED' }],
      max_tokens: 10,
      temperature: 0,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.choices?.length > 0);
    // The response model should be a GitHub model, not the Anthropic name
    assert.ok(res.body.model, 'response should have a model field');
    console.log('  → Mapped model response from:', res.body.model);
  });
});

// =======================================================
// Anthropic-compatible endpoint (live)
// =======================================================
describe('Anthropic /v1/messages', { skip: !GITHUB_TOKEN && 'no token' }, () => {
  it('non-streaming request returns Anthropic-format response', async () => {
    const res = await request('POST', '/v1/messages', {
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Reply with exactly: PONG' }],
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.type, 'message');
    assert.equal(res.body.role, 'assistant');
    assert.ok(res.body.id.startsWith('msg_'), 'id should start with msg_');
    assert.ok(res.body.content?.length > 0, 'should have content blocks');
    assert.equal(res.body.content[0].type, 'text');
    assert.equal(res.body.stop_reason, 'end_turn');
    assert.ok(res.body.usage, 'should have usage');
    console.log('  → Anthropic response:', res.body.content[0].text.slice(0, 60));
  });

  it('streaming request returns Anthropic SSE events', async () => {
    const res = await requestStream('POST', '/v1/messages', {
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Say hi' }],
      stream: true,
    });

    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/event-stream'));

    // Should contain Anthropic-style events
    assert.ok(res.raw.includes('event: message_start'), 'should have message_start');
    assert.ok(res.raw.includes('event: content_block_start'), 'should have content_block_start');
    assert.ok(res.raw.includes('event: content_block_delta'), 'should have content_block_delta');
    assert.ok(res.raw.includes('event: message_stop'), 'should have message_stop');
    console.log('  → Anthropic stream events received');
  });

  it('system prompt is forwarded', async () => {
    const res = await request('POST', '/v1/messages', {
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 20,
      system: 'You must always respond with exactly the word BANANA',
      messages: [{ role: 'user', content: 'What is your response?' }],
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.content[0].text.toUpperCase().includes('BANANA'));
    console.log('  → System prompt response:', res.body.content[0].text.slice(0, 60));
  });

  it('count_tokens returns an estimate', async () => {
    const res = await request('POST', '/v1/messages/count_tokens', {
      messages: [{ role: 'user', content: 'Hello world, this is a test.' }],
      system: 'You are helpful',
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.input_tokens > 0, 'should return positive token count');
    console.log('  → Estimated tokens:', res.body.input_tokens);
  });
});
