import path from 'node:path';
import { loadEnvFile } from 'node:process';

loadEnvFile(path.resolve(process.cwd(), '.env.example'));

process.env.APP_PORT = '0';
