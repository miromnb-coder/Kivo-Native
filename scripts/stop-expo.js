const { execSync } = require('node:child_process');

const currentPid = process.pid;
const parentPid = process.ppid;

function listProcesses() {
  try {
    return execSync('ps -axo pid=,ppid=,command=', { encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s+(\d+)\s+(.+)$/);
        if (!match) return null;

        return {
          pid: Number(match[1]),
          ppid: Number(match[2]),
          command: match[3],
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.log('Could not inspect running processes. Continuing.');
    return [];
  }
}

function shouldStopProcess(processInfo) {
  const command = processInfo.command.toLowerCase();

  if (!Number.isFinite(processInfo.pid)) return false;
  if (processInfo.pid === currentPid || processInfo.pid === parentPid) return false;
  if (command.includes('scripts/stop-expo.js')) return false;
  if (command.includes('npm run dev:stop')) return false;
  if (command.includes('npm run phone:fallback')) return false;
  if (command.includes('npm run phone:fallback2')) return false;
  if (command.includes('npm run phone:fallback3')) return false;

  return (
    command.includes('expo start') ||
    command.includes('@expo/ngrok') ||
    /(^|\s)ngrok(\s|$)/.test(command)
  );
}

const targets = listProcesses().filter(shouldStopProcess);

if (targets.length === 0) {
  console.log('No old Expo tunnel processes found.');
  process.exit(0);
}

for (const target of targets) {
  try {
    process.kill(target.pid, 'SIGTERM');
    console.log(`Stopped ${target.pid}: ${target.command.slice(0, 90)}`);
  } catch (error) {
    console.log(`Could not stop ${target.pid}. It may already be closed.`);
  }
}

setTimeout(() => process.exit(0), 250);
