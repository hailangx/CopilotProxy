/**
 * Anthropic-compatible routes.
 * POST /v1/messages           — Claude-style messages endpoint
 * POST /v1/messages/count_tokens — token estimation
 * ALL  /v1/auth*              — stub for Claude Code auth probes
 */
const { Router } = require('express');
const { resolveModel, MAX_TOKENS_LIMIT } = require('../lib/model-map');
const { forwardToGitHub, hasToken } = require('../lib/proxy');
const {
  convertMessages,
  convertResponse,
  convertStreamChunk,
} = require('../lib/anthropic-converter');

const router = Router();

// ---- Auth stub (Claude Code probes this) ----
router.all('/v1/auth*', (req, res) => {
  console.log(`[AUTH] ${req.method} ${req.url}`);
  res.json({ valid: true });
});

// ---- Token counting ----
router.post('/v1/messages/count_tokens', (req, res) => {
  const { messages = [], system } = req.body;
  let totalChars = 0;
  if (system) totalChars += system.length;
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      totalChars += msg.content.length;
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'text') totalChars += block.text.length;
        else totalChars += JSON.stringify(block).length;
      }
    }
  }
  res.json({ input_tokens: Math.ceil(totalChars / 4) });
});

// ---- Messages endpoint ----
router.post('/v1/messages', async (req, res) => {
  if (!hasToken()) {
    return res.status(500).json({ error: { message: 'GITHUB_TOKEN not configured' } });
  }

  const {
    model,
    messages,
    system,
    max_tokens = 4096,
    temperature = 1,
    stream = false,
    top_p,
    stop_sequences,
  } = req.body;

  const githubModel = resolveModel(model);
  const convertedMessages = convertMessages(messages, system);
  const cappedMaxTokens = Math.min(max_tokens, MAX_TOKENS_LIMIT);

  const githubRequest = {
    model: githubModel,
    messages: convertedMessages,
    max_tokens: cappedMaxTokens,
    temperature,
    stream,
  };
  if (top_p !== undefined) githubRequest.top_p = top_p;
  if (stop_sequences) githubRequest.stop = stop_sequences;

  forwardToGitHub(
    githubRequest,
    (proxyRes) => {
      if (stream) {
        handleAnthropicStream(res, proxyRes, model);
      } else {
        handleAnthropicNonStream(res, proxyRes, model);
      }
    },
    (err) => {
      console.error('Proxy request error:', err);
      res.status(500).json({
        error: { type: 'api_error', message: `Proxy request failed: ${err.message}` },
      });
    }
  );
});

// ---- Streaming helper (translates OpenAI SSE → Anthropic SSE) ----
function handleAnthropicStream(res, proxyRes, model) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // message_start
  const startEvent = {
    type: 'message_start',
    message: {
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 },
    },
  };
  res.write(`event: message_start\ndata: ${JSON.stringify(startEvent)}\n\n`);

  // content_block_start
  res.write(
    `event: content_block_start\ndata: ${JSON.stringify({
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text', text: '' },
    })}\n\n`
  );

  let buffer = '';
  let eventId = 0;

  proxyRes.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();

      if (data === '[DONE]') {
        res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`);
        res.write(`event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 0 } })}\n\n`);
        res.write(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
      } else {
        const converted = convertStreamChunk(data, eventId++, model);
        if (converted) {
          res.write(`event: ${converted.type}\ndata: ${JSON.stringify(converted)}\n\n`);
        }
      }
    }
  });

  proxyRes.on('end', () => res.end());
  proxyRes.on('error', (err) => {
    console.error('Proxy response error:', err);
    res.end();
  });
}

// ---- Non-streaming helper ----
function handleAnthropicNonStream(res, proxyRes, model) {
  let body = '';
  proxyRes.on('data', (chunk) => { body += chunk.toString(); });
  proxyRes.on('end', () => {
    try {
      if (proxyRes.statusCode !== 200) {
        console.error('GitHub API error:', proxyRes.statusCode, body);
        return res.status(proxyRes.statusCode).json({
          error: { type: 'api_error', message: `GitHub API error: ${body}` },
        });
      }
      const githubResponse = JSON.parse(body);
      res.json(convertResponse(githubResponse, model));
    } catch (err) {
      console.error('Response parsing error:', err);
      res.status(500).json({
        error: { type: 'api_error', message: 'Failed to parse GitHub API response' },
      });
    }
  });
}

module.exports = router;
