/**
 * Model listing routes (shared by both OpenAI and Anthropic consumers).
 * GET /v1/models       — list all available models
 * GET /v1/models/:model — single model info
 */
const { Router } = require('express');
const { MODEL_MAP, GITHUB_MODELS } = require('../lib/model-map');

const router = Router();

// List all models (OpenAI-compatible format)
router.get('/v1/models', (req, res) => {
  const githubModels = GITHUB_MODELS.map((id) => ({
    id,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'github',
  }));

  const anthropicModels = Object.keys(MODEL_MAP).map((id) => ({
    id,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'anthropic',
  }));

  res.json({ object: 'list', data: [...githubModels, ...anthropicModels] });
});

// Single model info
router.get('/v1/models/:model', (req, res) => {
  const model = req.params.model;
  res.json({
    id: model,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: MODEL_MAP[model] ? 'anthropic' : 'github',
  });
});

module.exports = router;
