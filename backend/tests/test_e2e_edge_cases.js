'use strict';

const http = require('http');

const BASE_URL = 'http://localhost:3001';

function request(path, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      timeout: options.timeout || 15000,
    };

    if (postData) {
      if (typeof postData === 'object') {
        postData = JSON.stringify(postData);
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (postData) req.write(postData);
    req.end();
  });
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

let passed = 0;
let failed = 0;

// ==================== EDGE CASES ====================

// 1. Health check baseline
test('GET /api/health -> 200 OK with vectorStoreSize', async () => {
  const res = await request('/api/health');
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (res.body.status !== 'ok') throw new Error(`Expected status: ok, got ${res.body.status}`);
});

// 2. Ingest: Empty body
test('POST /api/ingest with empty object -> 400 Validation Error', async () => {
  const res = await request('/api/ingest', { method: 'POST' }, {});
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  if (res.body.error?.code !== 'VALIDATION_ERROR') throw new Error(`Expected VALIDATION_ERROR code`);
});

// 3. Ingest: Invalid type parameter
test('POST /api/ingest with invalid type "pdf" -> 400 Validation Error', async () => {
  const res = await request('/api/ingest', { method: 'POST' }, { type: 'pdf', content: 'test data' });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  if (res.body.error?.code !== 'VALIDATION_ERROR') throw new Error(`Expected VALIDATION_ERROR code`);
});

// 4. Ingest: Empty content string
test('POST /api/ingest with empty string -> 400 Validation Error', async () => {
  const res = await request('/api/ingest', { method: 'POST' }, { type: 'note', content: '' });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
});

// 5. Ingest: Only whitespace note
test('POST /api/ingest with whitespace only -> 422 CONTENT_TOO_SHORT', async () => {
  const res = await request('/api/ingest', { method: 'POST' }, { type: 'note', content: '          \n   \t  ' });
  if (res.status !== 422) throw new Error(`Expected 422, got ${res.status}`);
  if (res.body.error?.code !== 'CONTENT_TOO_SHORT') throw new Error(`Expected CONTENT_TOO_SHORT code`);
});

// 6. Ingest: Short content below threshold (less than 10 characters)
test('POST /api/ingest with 5 chars -> 422 CONTENT_TOO_SHORT', async () => {
  const res = await request('/api/ingest', { method: 'POST' }, { type: 'note', content: 'short' });
  if (res.status !== 422) throw new Error(`Expected 422, got ${res.status}`);
  if (res.body.error?.code !== 'CONTENT_TOO_SHORT') throw new Error(`Expected CONTENT_TOO_SHORT code`);
});

// 7. Ingest: Malformed URL
test('POST /api/ingest with invalid URL "not-a-url" -> 400 Validation Error', async () => {
  const res = await request('/api/ingest', { method: 'POST' }, { type: 'url', content: 'not-a-url' });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
});

// 8. Ingest: Non-http/https URL protocol (ftp:// or javascript:)
test('POST /api/ingest with "ftp://example.com" -> 400 Validation Error', async () => {
  const res = await request('/api/ingest', { method: 'POST' }, { type: 'url', content: 'ftp://example.com' });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
});

// 9. Ingest: Unreachable / Non-existent URL host
test('POST /api/ingest with dead domain "https://this-domain-does-not-exist-at-all-xyz999.com" -> 422 Fetch Error', async () => {
  const res = await request('/api/ingest', { method: 'POST', timeout: 15000 }, {
    type: 'url',
    content: 'https://this-domain-does-not-exist-at-all-xyz999.com',
  });
  if (res.status !== 422) throw new Error(`Expected 422, got ${res.status}`);
  if (res.body.error?.code !== 'FETCH_ERROR') throw new Error(`Expected FETCH_ERROR code`);
});

// 10. Ingest: Special Unicode characters, Emoji, RTL script
test('POST /api/ingest with emojis and multilingual characters -> 201 Created', async () => {
  const unicodeContent = '🧠 인공지능 Knowledge Vault with symbols: 日本語 & العربية & 🚀! Modern LLM architecture testing.';
  const res = await request('/api/ingest', { method: 'POST' }, { type: 'note', content: unicodeContent });
  if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  if (!res.body.id || res.body.chunkCount < 1) throw new Error('Expected created item with chunkCount >= 1');
});

// 11. Ingest: Very large note (multi-paragraph ~3000 chars) -> multiple chunks generated
test('POST /api/ingest large text -> splits into multiple chunks', async () => {
  const paragraph = 'Distributed systems require fault-tolerant consensus algorithms such as Raft or Paxos to maintain consistent state across replicas. ';
  const largeContent = paragraph.repeat(25); // ~3500 chars
  const res = await request('/api/ingest', { method: 'POST' }, { type: 'note', content: largeContent });
  if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
  if (res.body.chunkCount <= 1) throw new Error(`Expected multiple chunks, got ${res.body.chunkCount}`);
});

// 12. Query: Empty question string
test('POST /api/query with empty question -> 400 Validation Error', async () => {
  const res = await request('/api/query', { method: 'POST' }, { question: '' });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
});

// 13. Query: Whitespace-only question
test('POST /api/query with whitespace question -> 400 Validation Error', async () => {
  const res = await request('/api/query', { method: 'POST' }, { question: '      ' });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
});

// 14. Query: Question over 500 characters
test('POST /api/query with question > 500 chars -> 400 Validation Error', async () => {
  const longQ = 'What is '.padEnd(520, 'a');
  const res = await request('/api/query', { method: 'POST' }, { question: longQ });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
});

// 15. Query: Out-of-domain question (should say cannot find or answer from context)
test('POST /api/query out-of-domain question -> 200 with honest answer', async () => {
  const res = await request('/api/query', { method: 'POST' }, { question: 'What is the recipe for chocolate lava cake?' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body.answer || typeof res.body.answer !== 'string') throw new Error('Expected answer string');
});

// 16. Query: Specific question matching saved knowledge
test('POST /api/query matching stored note -> 200 with sources and answer', async () => {
  const res = await request('/api/query', { method: 'POST' }, { question: 'What algorithms are used for distributed systems consensus?' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!res.body.sources || res.body.sources.length === 0) throw new Error('Expected at least 1 cited source');
});

// 17. Items: Pagination with limits and offsets
test('GET /api/items?limit=2&offset=0 -> 200 with bounded items array', async () => {
  const res = await request('/api/items?limit=2&offset=0');
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (!Array.isArray(res.body.items)) throw new Error('Expected items array');
  if (res.body.items.length > 2) throw new Error(`Expected max 2 items, got ${res.body.items.length}`);
});

// 18. Items: Negative or invalid limit query param
test('GET /api/items?limit=-5 -> 400 Validation Error', async () => {
  const res = await request('/api/items?limit=-5');
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
});

// 19. Non-existent route
test('GET /api/unknown-endpoint -> 404 NOT_FOUND', async () => {
  const res = await request('/api/unknown-endpoint');
  if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  if (res.body.error?.code !== 'NOT_FOUND') throw new Error('Expected NOT_FOUND code');
});

async function run() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING EDGE CASE TEST SUITE (19 Edge Cases)');
  console.log('======================================================\n');

  for (const t of tests) {
    process.stdout.write(`• ${t.name} ... `);
    try {
      await t.fn();
      console.log('✅ PASS');
      passed++;
    } catch (err) {
      console.log(`❌ FAIL (${err.message})`);
      failed++;
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`Total: ${tests.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('------------------------------------------------------\n');
}

run();
