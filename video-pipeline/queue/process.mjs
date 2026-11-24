import { spawn } from 'node:child_process';

export function run(command, args, { input, timeout = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeout);
    child.stdout.setEncoding('utf8').on('data', data => { stdout += data; });
    child.stderr.setEncoding('utf8').on('data', data => { stderr += data; });
    child.on('error', reject);
    if (input) {
      child.stdin.on('error', reject);
      child.stdin.end(input);
    }
    child.on('close', code => {
      clearTimeout(timer);
      if (timedOut) reject(new Error(`${command} timed out after ${timeout}ms`));
      else if (code !== 0) reject(new Error(`${command} exited ${code}: ${stderr.trim()}`));
      else resolve({ stdout, stderr });
    });
  });
}
