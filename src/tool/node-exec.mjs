import { spawn } from 'node:child_process';

// const command = 'ls -la';
const command = 'pnpm create vite react-todo-app --template react-ts';
const cwd = process.cwd();

const [cmd, ...args] = command.split(' ');

const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });

let errorMsg = '';

child.on('error', (err) => {
  errorMsg = err.message;
});

child.on('close', (code) => {
  if (code === 0) {
    process.exit(0);
  } else {
    if (errorMsg) {
      console.error(`Command failed: ${errorMsg}`);
    }
    process.exit(code || 1);
  }
});
