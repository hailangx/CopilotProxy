require('dotenv').config();
const express = require('express');
const https = require('https');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Catch-all for unknown routes
app.use((req, res, next) => {
  if (!req.route && req.method !== 'OPTIONS') {
    // Let it continue to see if a route matches, but log unmatched at the end
  }
  next();
});

const PORT = process.env.PORT || 8080;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_URL = process.env.GITHUB_API_URL || 'https://models.inference.ai.azure.com';

// Model mapping: Anthropic model names -> GitHub model names
const MODEL_MAP = {
  'claude-3-5-sonnet-20241022': 'gpt-4o',
  'claude-3-5-sonnet-latest': 'gpt-4o',
  'claude-3-opus-20240229': 'gpt-4o',
  'claude-3-sonnet-20240229': 'gpt-4o',
  'claude-3-haiku-20240307': 'gpt-4o-mini',
  'claude-sonnet-4-20250514': 'gpt-4o',
  'claude-opus-4-20250514': 'gpt-4o',
  // Add more mappings as needed
};

// Convert Anthropic messages format to OpenAI/GitHub format
function convertMessages(anthropicMessages, systemPrompt) {
  const messages = [];
  
  // Add system message if present
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    });
  }
  
  for (const msg of anthropicMessages) {
    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    
    // Handle content array or string
    if (typeof msg.content === 'string') {
      messages.push({ role, content: msg.content });
    } else if (Array.isArray(msg.content)) {
      // Convert content blocks
      const contentParts = [];
      for (const block of msg.content) {
        if (block.type === 'text') {
          contentParts.push(block.text);
        } else if (block.type === 'image') {
          // GitHub Models API supports images in a different format
          contentParts.push(`[Image: ${block.source?.media_type || 'image'}]`);
        } else if (block.type === 'tool_use') {
          contentParts.push(`[Tool call: ${block.name}]`);
        } else if (block.type === 'tool_result') {
          contentParts.push(typeof block.content === 'string' ? block.content : JSON.stringify(block.content));
        }
      }
      messages.push({ role, content: contentParts.join('\n') });
    }
  }
  
  return messages;
}

// Convert OpenAI/GitHub response to Anthropic format
function convertResponse(githubResponse, model) {
  const content = [];
  
  if (githubResponse.choices && githubResponse.choices.length > 0) {
    const choice = githubResponse.choices[0];
    const message = choice.message || {};
    
    if (message.content) {
      content.push({
        type: 'text',
        text: message.content
      });
    }
  }
  
  return {
    id: `msg_${githubResponse.id || Date.now()}`,
    type: 'message',
    role: 'assistant',
    model: model,
    content: content,
    stop_reason: githubResponse.choices?.[0]?.finish_reason === 'stop' ? 'end_turn' : 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: githubResponse.usage?.prompt_tokens || 0,
      output_tokens: githubResponse.usage?.completion_tokens || 0
    }
  };
}

// Convert streaming chunk to Anthropic SSE format
function convertStreamChunk(chunk, eventId, model) {
  if (!chunk || chunk === '[DONE]') {
    return null;
  }
  
  try {
    const data = JSON.parse(chunk);
    const choice = data.choices?.[0];
    
    if (!choice) return null;
    
    const delta = choice.delta || {};
    
    if (delta.content) {
      return {
        type: 'content_block_delta',
        index: 0,
        delta: {
          type: 'text_delta',
          text: delta.content
        }
      };
    }
    
    if (choice.finish_reason) {
      return {
        type: 'message_delta',
        delta: {
          stop_reason: 'end_turn',
          stop_sequence: null
        },
        usage: {
          output_tokens: data.usage?.completion_tokens || 0
        }
      };
    }
  } catch (e) {
    // Ignore parse errors for incomplete chunks
  }
  
  return null;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch any auth/token validation endpoints Claude Code might call
app.all('/v1/auth*', (req, res) => {
  console.log(`[AUTH] ${req.method} ${req.url}`);
  res.json({ valid: true });
});

// Handle model info requests  
app.get('/v1/models/:model', (req, res) => {
  const model = req.params.model;
  res.json({
    id: model,
    object: 'model',
    created: Date.now(),
    owned_by: 'anthropic'
  });
});

// Token counting endpoint - Claude Code calls this before sending messages
app.post('/v1/messages/count_tokens', (req, res) => {
  const { messages = [], system } = req.body;
  // Estimate tokens (rough: 4 chars per token)
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
  const estimatedTokens = Math.ceil(totalChars / 4);
  res.json({ input_tokens: estimatedTokens });
});

// Catch-all for any other routes Claude Code might hit
app.all('*', (req, res, next) => {
  // If no route matched yet, check if it's a known route
  if (req.url.startsWith('/v1/messages') || req.url.startsWith('/v1/models') || req.url === '/health') {
    return next();
  }
  console.log(`[UNHANDLED] ${req.method} ${req.url} - Body: ${JSON.stringify(req.body).slice(0, 200)}`);
  // Return 200 with empty success response for unknown endpoints
  res.json({ status: 'ok' });
});

// List models endpoint (Anthropic format)
app.get('/v1/models', (req, res) => {
  res.json({
    data: Object.keys(MODEL_MAP).map(id => ({
      id,
      object: 'model',
      created: Date.now(),
      owned_by: 'anthropic'
    }))
  });
});

// Main messages endpoint (Anthropic format)
app.post('/v1/messages', async (req, res) => {
  if (!GITHUB_TOKEN) {
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
    stop_sequences
  } = req.body;
  
  // Map model name
  const githubModel = MODEL_MAP[model] || 'gpt-4o';
  
  // Convert messages
  const convertedMessages = convertMessages(messages, system);
  
  // Cap max_tokens to GitHub model limits
  const MAX_TOKENS_LIMIT = 16384;
  const cappedMaxTokens = Math.min(max_tokens, MAX_TOKENS_LIMIT);
  
  // Build GitHub API request
  const githubRequest = {
    model: githubModel,
    messages: convertedMessages,
    max_tokens: cappedMaxTokens,
    temperature,
    stream
  };
  
  if (top_p !== undefined) githubRequest.top_p = top_p;
  if (stop_sequences) githubRequest.stop = stop_sequences;
  
  const url = new URL('/chat/completions', GITHUB_API_URL);
  
  const options = {
    method: 'POST',
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'copilot-proxy/1.0'
    }
  };
  
  const proxyReq = https.request(options, (proxyRes) => {
    if (stream) {
      // Handle streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Send initial message_start event
      const startEvent = {
        type: 'message_start',
        message: {
          id: `msg_${Date.now()}`,
          type: 'message',
          role: 'assistant',
          model: model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 }
        }
      };
      res.write(`event: message_start\ndata: ${JSON.stringify(startEvent)}\n\n`);
      
      // Send content_block_start
      res.write(`event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`);
      
      let buffer = '';
      let eventId = 0;
      
      proxyRes.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              // Send content_block_stop
              res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`);
              // Send message_delta with stop reason
              res.write(`event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 0 } })}\n\n`);
              // Send message_stop
              res.write(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
            } else {
              const converted = convertStreamChunk(data, eventId++, model);
              if (converted) {
                const eventType = converted.type;
                res.write(`event: ${eventType}\ndata: ${JSON.stringify(converted)}\n\n`);
              }
            }
          }
        }
      });
      
      proxyRes.on('end', () => {
        res.end();
      });
      
      proxyRes.on('error', (err) => {
        console.error('Proxy response error:', err);
        res.end();
      });
    } else {
      // Handle non-streaming response
      let body = '';
      proxyRes.on('data', (chunk) => {
        body += chunk.toString();
      });
      
      proxyRes.on('end', () => {
        try {
          if (proxyRes.statusCode !== 200) {
            console.error('GitHub API error:', proxyRes.statusCode, body);
            return res.status(proxyRes.statusCode).json({
              error: {
                type: 'api_error',
                message: `GitHub API error: ${body}`
              }
            });
          }
          
          const githubResponse = JSON.parse(body);
          const anthropicResponse = convertResponse(githubResponse, model);
          res.json(anthropicResponse);
        } catch (err) {
          console.error('Response parsing error:', err);
          res.status(500).json({
            error: {
              type: 'api_error',
              message: 'Failed to parse GitHub API response'
            }
          });
        }
      });
    }
  });
  
  proxyReq.on('error', (err) => {
    console.error('Proxy request error:', err);
    res.status(500).json({
      error: {
        type: 'api_error',
        message: `Proxy request failed: ${err.message}`
      }
    });
  });
  
  proxyReq.write(JSON.stringify(githubRequest));
  proxyReq.end();
});

// Start server
app.listen(PORT, () => {
  console.log(`GitHub Copilot API Proxy running on http://localhost:${PORT}`);
  console.log(`Target API: ${GITHUB_API_URL}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /v1/messages - Anthropic-compatible messages API`);
  console.log(`  GET  /v1/models   - List available models`);
  console.log(`  GET  /health      - Health check`);
  console.log(`\nConfigure Claude Code to use:`);
  console.log(`  ANTHROPIC_BASE_URL=http://localhost:${PORT}`);
});
