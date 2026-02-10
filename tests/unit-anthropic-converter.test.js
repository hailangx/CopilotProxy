/**
 * Unit tests for lib/anthropic-converter.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  convertMessages,
  convertResponse,
  convertStreamChunk,
} = require('../lib/anthropic-converter');

describe('anthropic-converter', () => {
  // ---- convertMessages ----
  describe('convertMessages', () => {
    it('prepends system prompt as system role', () => {
      const result = convertMessages(
        [{ role: 'user', content: 'Hi' }],
        'You are helpful'
      );
      assert.equal(result[0].role, 'system');
      assert.equal(result[0].content, 'You are helpful');
      assert.equal(result[1].role, 'user');
      assert.equal(result[1].content, 'Hi');
    });

    it('handles string content', () => {
      const result = convertMessages([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ]);
      assert.deepEqual(result, [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ]);
    });

    it('handles content block arrays with text', () => {
      const result = convertMessages([
        {
          role: 'user',
          content: [
            { type: 'text', text: 'First' },
            { type: 'text', text: 'Second' },
          ],
        },
      ]);
      assert.equal(result[0].content, 'First\nSecond');
    });

    it('handles image blocks', () => {
      const result = convertMessages([
        {
          role: 'user',
          content: [{ type: 'image', source: { media_type: 'image/png' } }],
        },
      ]);
      assert.equal(result[0].content, '[Image: image/png]');
    });

    it('handles tool_use blocks', () => {
      const result = convertMessages([
        {
          role: 'assistant',
          content: [{ type: 'tool_use', name: 'read_file', id: '1', input: {} }],
        },
      ]);
      assert.equal(result[0].content, '[Tool call: read_file]');
    });

    it('handles tool_result blocks', () => {
      const result = convertMessages([
        {
          role: 'user',
          content: [{ type: 'tool_result', content: 'file contents here' }],
        },
      ]);
      assert.equal(result[0].content, 'file contents here');
    });

    it('handles tool_result with object content', () => {
      const result = convertMessages([
        {
          role: 'user',
          content: [{ type: 'tool_result', content: { key: 'value' } }],
        },
      ]);
      assert.equal(result[0].content, '{"key":"value"}');
    });

    it('works with no system prompt', () => {
      const result = convertMessages([{ role: 'user', content: 'Hi' }]);
      assert.equal(result.length, 1);
      assert.equal(result[0].role, 'user');
    });
  });

  // ---- convertResponse ----
  describe('convertResponse', () => {
    it('converts a standard OpenAI response to Anthropic format', () => {
      const openaiResp = {
        id: 'chatcmpl-123',
        choices: [
          {
            message: { role: 'assistant', content: 'Hello!' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      };

      const result = convertResponse(openaiResp, 'claude-3-5-sonnet-latest');

      assert.equal(result.type, 'message');
      assert.equal(result.role, 'assistant');
      assert.equal(result.model, 'claude-3-5-sonnet-latest');
      assert.equal(result.content[0].type, 'text');
      assert.equal(result.content[0].text, 'Hello!');
      assert.equal(result.stop_reason, 'end_turn');
      assert.equal(result.usage.input_tokens, 10);
      assert.equal(result.usage.output_tokens, 5);
      assert.ok(result.id.startsWith('msg_'));
    });

    it('handles empty choices', () => {
      const result = convertResponse({ choices: [] }, 'test-model');
      assert.deepEqual(result.content, []);
    });

    it('handles missing usage', () => {
      const result = convertResponse(
        { choices: [{ message: { content: 'Hi' } }] },
        'test'
      );
      assert.equal(result.usage.input_tokens, 0);
      assert.equal(result.usage.output_tokens, 0);
    });
  });

  // ---- convertStreamChunk ----
  describe('convertStreamChunk', () => {
    it('converts content delta', () => {
      const chunk = JSON.stringify({
        choices: [{ delta: { content: 'Hello' }, index: 0 }],
      });
      const result = convertStreamChunk(chunk);
      assert.equal(result.type, 'content_block_delta');
      assert.equal(result.delta.type, 'text_delta');
      assert.equal(result.delta.text, 'Hello');
    });

    it('converts finish_reason to message_delta', () => {
      const chunk = JSON.stringify({
        choices: [{ delta: {}, finish_reason: 'stop' }],
        usage: { completion_tokens: 42 },
      });
      const result = convertStreamChunk(chunk);
      assert.equal(result.type, 'message_delta');
      assert.equal(result.delta.stop_reason, 'end_turn');
      assert.equal(result.usage.output_tokens, 42);
    });

    it('returns null for [DONE]', () => {
      assert.equal(convertStreamChunk('[DONE]'), null);
    });

    it('returns null for empty/null input', () => {
      assert.equal(convertStreamChunk(null), null);
      assert.equal(convertStreamChunk(''), null);
    });

    it('returns null for invalid JSON', () => {
      assert.equal(convertStreamChunk('not json'), null);
    });

    it('returns null when no choices', () => {
      assert.equal(convertStreamChunk(JSON.stringify({ choices: [] })), null);
    });
  });
});
