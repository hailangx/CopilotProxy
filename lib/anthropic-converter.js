/**
 * Helpers to translate between Anthropic Messages API format and OpenAI format.
 */

// Convert Anthropic messages format to OpenAI/GitHub format
function convertMessages(anthropicMessages, systemPrompt) {
  const messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  for (const msg of anthropicMessages) {
    const role = msg.role === 'assistant' ? 'assistant' : 'user';

    if (typeof msg.content === 'string') {
      messages.push({ role, content: msg.content });
    } else if (Array.isArray(msg.content)) {
      const contentParts = [];
      for (const block of msg.content) {
        if (block.type === 'text') {
          contentParts.push(block.text);
        } else if (block.type === 'image') {
          contentParts.push(`[Image: ${block.source?.media_type || 'image'}]`);
        } else if (block.type === 'tool_use') {
          contentParts.push(`[Tool call: ${block.name}]`);
        } else if (block.type === 'tool_result') {
          contentParts.push(
            typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content)
          );
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
    const message = githubResponse.choices[0].message || {};
    if (message.content) {
      content.push({ type: 'text', text: message.content });
    }
  }

  return {
    id: `msg_${githubResponse.id || Date.now()}`,
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: githubResponse.usage?.prompt_tokens || 0,
      output_tokens: githubResponse.usage?.completion_tokens || 0,
    },
  };
}

// Convert a single streaming chunk (OpenAI SSE data) to Anthropic SSE event
function convertStreamChunk(chunk) {
  if (!chunk || chunk === '[DONE]') return null;

  try {
    const data = JSON.parse(chunk);
    const choice = data.choices?.[0];
    if (!choice) return null;

    const delta = choice.delta || {};

    if (delta.content) {
      return {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: delta.content },
      };
    }

    if (choice.finish_reason) {
      return {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: null },
        usage: { output_tokens: data.usage?.completion_tokens || 0 },
      };
    }
  } catch (_) {
    // Ignore parse errors for incomplete chunks
  }

  return null;
}

module.exports = { convertMessages, convertResponse, convertStreamChunk };
