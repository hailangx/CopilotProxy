/**
 * Unit tests for lib/model-map.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { MODEL_MAP, GITHUB_MODELS, MAX_TOKENS_LIMIT, resolveModel } = require('../lib/model-map');

describe('model-map', () => {
  describe('resolveModel', () => {
    it('maps Anthropic model names to GitHub models', () => {
      assert.equal(resolveModel('claude-3-5-sonnet-latest'), 'gpt-4o');
      assert.equal(resolveModel('claude-3-haiku-20240307'), 'gpt-4o-mini');
      assert.equal(resolveModel('claude-sonnet-4-20250514'), 'gpt-4o');
      assert.equal(resolveModel('claude-opus-4-20250514'), 'gpt-4o');
    });

    it('passes through known GitHub model names', () => {
      assert.equal(resolveModel('gpt-4o'), 'gpt-4o');
      assert.equal(resolveModel('gpt-4o-mini'), 'gpt-4o-mini');
      assert.equal(resolveModel('DeepSeek-R1'), 'DeepSeek-R1');
      assert.equal(resolveModel('o3-mini'), 'o3-mini');
    });

    it('passes through unknown model names as-is', () => {
      assert.equal(resolveModel('some-future-model'), 'some-future-model');
      assert.equal(resolveModel('custom-model-v2'), 'custom-model-v2');
    });
  });

  describe('constants', () => {
    it('MODEL_MAP has entries', () => {
      assert.ok(Object.keys(MODEL_MAP).length > 0);
    });

    it('GITHUB_MODELS has entries', () => {
      assert.ok(GITHUB_MODELS.length > 0);
      assert.ok(GITHUB_MODELS.includes('gpt-4o'));
    });

    it('MAX_TOKENS_LIMIT is 16384', () => {
      assert.equal(MAX_TOKENS_LIMIT, 16384);
    });
  });
});
