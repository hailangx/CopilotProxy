const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_URL = process.env.GITHUB_API_URL || 'https://models.inference.ai.azure.com';

/**
 * Forward a request to GitHub Models API.
 * Returns a Node.js http.ClientRequest so callers can handle the response.
 *
 * @param {object} body - JSON body to send
 * @param {function} onResponse - callback(proxyRes) for the upstream response
 * @param {function} onError - callback(err)
 */
function forwardToGitHub(body, onResponse, onError) {
  const url = new URL('/chat/completions', GITHUB_API_URL);

  const options = {
    method: 'POST',
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'copilot-proxy/1.0',
    },
  };

  const proxyReq = https.request(options, onResponse);
  proxyReq.on('error', onError);
  proxyReq.write(JSON.stringify(body));
  proxyReq.end();

  return proxyReq;
}

/**
 * Check whether a GitHub token is configured.
 */
function hasToken() {
  return !!GITHUB_TOKEN;
}

module.exports = { forwardToGitHub, hasToken, GITHUB_API_URL };
