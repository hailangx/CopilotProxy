/**
 * OpenAI-compatible routes.
 * POST /v1/chat/completions — pass-through proxy to GitHub Models API.
 */
const { Router } = require('express');
const { resolveModel, MAX_TOKENS_LIMIT } = require('../lib/model-map');
const { forwardToGitHub, hasToken } = require('../lib/proxy');

const router = Router();

router.post('/v1/chat/completions', async (req, res) => {
  if (!hasToken()) {
    return res.status(500).json({
      error: { message: 'GITHUB_TOKEN not configured', type: 'server_error' },
    });
  }

  const {
    model = 'gpt-4o',
    messages,
    max_tokens,
    max_completion_tokens,
    temperature,
    stream = false,
    top_p,
    stop,
    presence_penalty,
    frequency_penalty,
    n,
    response_format,
    tools,
    tool_choice,
    seed,
  } = req.body;

  const githubModel = resolveModel(model);
  const effectiveMaxTokens = max_completion_tokens || max_tokens;
  const cappedMaxTokens = effectiveMaxTokens
    ? Math.min(effectiveMaxTokens, MAX_TOKENS_LIMIT)
    : undefined;

  // Build request — pass through OpenAI-compatible fields directly
  const githubRequest = { model: githubModel, messages };
  if (cappedMaxTokens !== undefined) githubRequest.max_tokens = cappedMaxTokens;
  if (temperature !== undefined) githubRequest.temperature = temperature;
  if (top_p !== undefined) githubRequest.top_p = top_p;
  if (stop !== undefined) githubRequest.stop = stop;
  if (presence_penalty !== undefined) githubRequest.presence_penalty = presence_penalty;
  if (frequency_penalty !== undefined) githubRequest.frequency_penalty = frequency_penalty;
  if (n !== undefined) githubRequest.n = n;
  if (response_format !== undefined) githubRequest.response_format = response_format;
  if (tools !== undefined) githubRequest.tools = tools;
  if (tool_choice !== undefined) githubRequest.tool_choice = tool_choice;
  if (seed !== undefined) githubRequest.seed = seed;
  if (stream) githubRequest.stream = true;

  forwardToGitHub(
    githubRequest,
    (proxyRes) => {
      if (stream) {
        // Stream SSE directly — already in OpenAI format
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        proxyRes.pipe(res);
      } else {
        let body = '';
        proxyRes.on('data', (chunk) => { body += chunk.toString(); });
        proxyRes.on('end', () => {
          try {
            res.status(proxyRes.statusCode)
              .setHeader('Content-Type', 'application/json')
              .end(body);
          } catch (err) {
            console.error('Response error:', err);
            res.status(500).json({
              error: { message: 'Failed to proxy response', type: 'server_error' },
            });
          }
        });
      }
    },
    (err) => {
      console.error('Proxy request error:', err);
      res.status(500).json({
        error: { message: `Proxy request failed: ${err.message}`, type: 'server_error' },
      });
    }
  );
});

module.exports = router;
