import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = '3197';
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', port], { stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
server.stdout.on('data', data => { logs += data; });
server.stderr.on('data', data => { logs += data; });
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw Error('Server exited before readiness: ' + logs);
    try { if ((await fetch(base, { signal: AbortSignal.timeout(2000), redirect: 'follow' })).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'Server readiness timeout');
  const landing = await fetch(base);
  assert.equal(landing.status, 200);
  assert.ok(!(await landing.text()).includes('Espace de '), 'Private workspace must not be rendered anonymously');
  const headers = { 'Content-Type': 'application/json', 'oai-authenticated-user-id': 'forged-user', 'oai-authenticated-user-email': 'forged@example.invalid' };
  for (const [path, method, body] of [
    ['/api/portfolio', 'GET'],
    ['/api/portfolio', 'PUT', JSON.stringify({ userId: 'forged-user', state: {} })],
    ['/api/quotes', 'POST', JSON.stringify({ assets: [] })],
  ]) {
    const response = await fetch(base + path, { method, headers, body });
    assert.ok([401, 503].includes(response.status), method + ' ' + path + ' must reject an anonymous request even with forged legacy headers');
    const payload = await response.json();
    assert.equal(typeof payload.error, 'string');
    assert.equal(payload.state, undefined);
  }
  const callback = await fetch(base + '/auth/callback?code=invalid-test-code', { redirect: 'manual' });
  assert.equal(callback.status, 307);
  assert.equal(new URL(callback.headers.get('location')).pathname, '/');
  assert.ok(callback.headers.get('location').includes('auth_error=confirmation'));
  console.log('Auth HTTP checks: anonymous APIs and forged legacy identity rejected; invalid callback rejected.');
} finally {
  const stopped = once(server, 'exit');
  if (server.exitCode === null) { server.kill(); await stopped; }
}
