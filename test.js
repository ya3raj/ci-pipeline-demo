const http = require('http');
const { spawn } = require('child_process');

const child = spawn(process.execPath, ['server.js'], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let settled = false;
const timeout = setTimeout(() => finish(new Error('Server did not start within 5 seconds')), 5000);

function finish(error) {
  if (settled) return;
  settled = true;
  clearTimeout(timeout);
  child.kill();
  if (error) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    console.log('Server startup test passed');
  }
}

child.on('error', finish);
child.stderr.on('data', data => process.stderr.write(data));

child.stdout.on('data', data => {
  process.stdout.write(data);
  if (!data.toString().includes('Server running on port 3000')) return;

  http.get('http://127.0.0.1:3000/', res => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
      if (res.statusCode !== 200) return finish(new Error(`Expected HTTP 200, got ${res.statusCode}`));
      if (body !== 'Hello World\n') return finish(new Error(`Unexpected response body: ${JSON.stringify(body)}`));
      finish();
    });
  }).on('error', finish);
});

child.on('exit', code => {
  if (!settled) finish(new Error(`Server exited early with code ${code}`));
});
