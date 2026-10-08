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
  mongoUri: process.env.MONGODB_URI || '',
  mongoDbName: process.env.MONGODB_DB || 'techcadd_portal',
  // GROQ_API_URL is accepted too because existing .env files store the key under that name
  groqApiKey: process.env.GROQ_API_KEY || process.env.GROQ_API_URL || '',
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  uploadDir: path.resolve(__dirname, '../../uploads'),
  distDir: path.resolve(__dirname, '../../../frontend/dist'),
};

export default config;
