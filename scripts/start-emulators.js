import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), '.emulator-data');
if (!fs.existsSync(dataDir)) {
	fs.mkdirSync(dataDir, { recursive: true });
}

const isWindows = process.platform === 'win32';
const cmd = isWindows ? 'npx.cmd' : 'npx';
const args = [
	'firebase',
	'emulators:start',
	'--only',
	'firestore',
	'--project',
	'placetrack-placement',
	'--import',
	'.emulator-data',
	'--export-on-exit',
	'.emulator-data'
];

console.log("Starting Firestore emulator for project 'placetrack-placement' with data directory .emulator-data...");
const child = spawn(cmd, args, { stdio: 'inherit', shell: isWindows });

child.on('error', (err) => {
	console.error('Failed to start Firestore emulator:', err);
	process.exit(1);
});

child.on('exit', (code) => {
	process.exit(code ?? 0);
});
