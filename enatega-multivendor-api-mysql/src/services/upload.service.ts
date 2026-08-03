import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { userInputError } from '../utils/errors';

const DATA_URL_PATTERN = /^data:(image\/(png|jpe?g|gif|webp));base64,(.+)$/;

export function saveBase64Image(dataUrl: string): string {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) {
    throw userInputError('image must be a base64 data URL (data:image/<type>;base64,...)');
  }
  const [, , extRaw, base64Data] = match;
  const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;

  if (!fs.existsSync(env.uploadDir)) {
    fs.mkdirSync(env.uploadDir, { recursive: true });
  }

  const filename = `${randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(env.uploadDir, filename), Buffer.from(base64Data, 'base64'));

  return `${env.publicUploadUrl}/${filename}`;
}
