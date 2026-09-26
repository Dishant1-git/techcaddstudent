import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'portal-secure-secret-key-2025',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  uploadDir: path.resolve(__dirname, '../../uploads'),
  distDir: path.resolve(__dirname, '../../../frontend/dist'),
};

export default config;
