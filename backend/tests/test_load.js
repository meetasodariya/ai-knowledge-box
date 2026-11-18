'use strict';

const http = require('http');

const BASE_URL = 'http://localhost:3001';

function request(path, options = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      timeout: 10000,
    };

    let postData = options.body;
    if (postData) {
      if (typeof postData === 'object') {
        postData = JSON.stringify(postData);
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          duration: Date.now() - start,
          success: res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, duration: Date.now() - start, success: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 408, duration: Date.now() - start, success: false, error: 'TIMEOUT' });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

function calculatePercentiles(latencies) {
  if (!latencies.length) return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p = (pct) => sorted[Math.floor(sorted.length * (pct / 100))];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: (sum / sorted.length).toFixed(1),
    p50: p(50),
    p95: p(95),
    p99: p(99),
  };
}

async function runScenario(name, totalRequests, concurrency, fn) {
  console.log(`\n======================================================`);
  console.log(`🚀 SCENARIO: ${name}`);
  console.log(`Total: ${totalRequests} reqs | Concurrency: ${concurrency} workers`);
  console.log(`======================================================`);

  const startTime = Date.now();
  const results = [];
  let completed = 0;
  let inFlight = 0;
  let index = 0;

  return new Promise((resolve) => {
    function launch() {
      while (inFlight < concurrency && index < totalRequests) {
        const currentIdx = index++;
        inFlight++;
        fn(currentIdx)
          .then((res) => {
            results.push(res);
          })
          .catch((err) => {
            results.push({ status: 500, duration: 0, success: false, error: err.message });
          })
          .finally(() => {
            inFlight--;
            completed++;
            if (completed % Math.max(1, Math.floor(totalRequests / 4)) === 0 || completed === totalRequests) {
              const rps = (completed / ((Date.now() - startTime) / 1000)).toFixed(1);
              console.log(`  Progress: ${completed}/${totalRequests} (${((completed / totalRequests) * 100).toFixed(0)}%) | Current Rate: ${rps} req/sec`);
            }
            if (completed >= totalRequests) {
              const totalElapsed = (Date.now() - startTime) / 1000;
              const latencies = results.map((r) => r.duration);
              const stats = calculatePercentiles(latencies);
              const successCount = results.filter((r) => r.success).length;
              const rateLimited = results.filter((r) => r.status === 429).length;
              const failed = totalRequests - successCount - rateLimited;

              console.log(`\n📊 RESULTS:`);
              console.log(`  • Wall Time:        ${totalElapsed.toFixed(2)}s`);
              console.log(`  • Throughput:       ${(totalRequests / totalElapsed).toFixed(1)} req/sec`);
              console.log(`  • Successful (2xx): ${successCount} / ${totalRequests} (${((successCount / totalRequests) * 100).toFixed(1)}%)`);
              if (rateLimited > 0) {
                console.log(`  • Rate Limited:     ${rateLimited} (Express Rate Limiter working as expected)`);
              }
              if (failed > 0) {
                console.log(`  • Failed (Errors):  ${failed}`);
              }
              console.log(`  • Latency Distribution:`);
              console.log(`      Min:  ${stats.min} ms`);
              console.log(`      Avg:  ${stats.avg} ms`);
              console.log(`      p50:  ${stats.p50} ms`);
              console.log(`      p95:  ${stats.p95} ms`);
              console.log(`      p99:  ${stats.p99} ms`);
              console.log(`      Max:  ${stats.max} ms`);
              resolve({ name, stats, successCount, totalRequests, totalElapsed });
            } else {
              launch();
            }
          });
      }
    }
    launch();
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('⚡ AI KNOWLEDGE INBOX LOAD & STRESS TEST SUITE');
  console.log('======================================================');

  // Scenario 1: High-Concurrency Read Stress on /api/health
  await runScenario('Health Check Endpoint (Read Burst)', 200, 20, () => request('/api/health'));

  // Scenario 2: Concurrent SQLite Reads with Pagination
  await runScenario('GET /api/items (Database Query Concurrency)', 100, 15, (idx) => {
    const offset = (idx * 2) % 10;
    return request(`/api/items?limit=5&offset=${offset}`);
  });

  // Scenario 3: Validation Edge Rejection Under Load
  await runScenario('Malformed Input Filter (Immediate 400 Rejections)', 100, 20, () =>
    request('/api/ingest', {
      method: 'POST',
      body: { type: 'invalid_type', content: 'test' },
    })
  );

  console.log('\n======================================================');
  console.log('🏁 ALL LOAD TEST SCENARIOS COMPLETED');
  console.log('======================================================\n');
}

main();
