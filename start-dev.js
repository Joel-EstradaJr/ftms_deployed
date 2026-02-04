#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Suppress dotenv/dotenvx console messages
process.env.DOTENV_CONFIG_SILENT = 'true';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use dotenv to load .env file (silent mode)
dotenv.config({ path: join(__dirname, '.env') });

// Get PORT from environment or default to 3000
const port = process.env.PORT || '3000';

// Start Next.js with the PORT
const args = ['dev', '-p', port];
const child = spawn('next', args, {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DOTENV_CONFIG_SILENT: 'true' }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
