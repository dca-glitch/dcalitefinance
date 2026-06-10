const baseUrl = process.env.HEALTH_BASE_URL || 'http://localhost:4000/api/v1/health';

async function check(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();

  if (!response.ok || body.success !== true) {
    throw new Error(`Health check failed for ${path}: ${response.status} ${JSON.stringify(body)}`);
  }

  console.log(`${path} OK`, body);
}

await check('/live');
await check('/ready');
