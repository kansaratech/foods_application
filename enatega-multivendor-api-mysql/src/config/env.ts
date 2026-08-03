import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  refreshTokenSecret: required('REFRESH_TOKEN_SECRET'),
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '90d',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
  publicUploadUrl: process.env.PUBLIC_UPLOAD_URL ?? 'http://localhost:4000/uploads',
};
