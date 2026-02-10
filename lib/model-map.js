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

// GitHub Models available (these pass through directly)
const GITHUB_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'o1',
  'o1-mini',
  'o1-preview',
  'o3-mini',
  'Phi-4',
  'Mistral-large-2411',
  'DeepSeek-R1',
  // Add more GitHub Models as they become available
];

const MAX_TOKENS_LIMIT = 16384;

// Resolve model name: support Anthropic names, GitHub native names, or fallback
function resolveModel(requestedModel) {
  if (MODEL_MAP[requestedModel]) return MODEL_MAP[requestedModel];
  if (GITHUB_MODELS.includes(requestedModel)) return requestedModel;
  return requestedModel;
}

module.exports = { MODEL_MAP, GITHUB_MODELS, MAX_TOKENS_LIMIT, resolveModel };
