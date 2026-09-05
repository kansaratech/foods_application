import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { userInputError } from '../utils/errors';

// Also accepts application/pdf: vendor/store KYC documents (PAN, GST
// certificate, ...) are commonly scanned straight to PDF, not just images.
const DATA_URL_PATTERN = /^data:(image\/(?:png|jpe?g|gif|webp)|application\/pdf);base64,(.+)$/;

export function saveBase64Image(dataUrl: string): string {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) {
    throw userInputError(
      'file must be a base64 data URL (data:image/<type>;base64,... or data:application/pdf;base64,...)',
    );
  }
  const [, mime, base64Data] = match;
  const subtype = mime.split('/')[1];
  const ext = subtype === 'jpeg' ? 'jpg' : subtype;

  if (!fs.existsSync(env.uploadDir)) {
    fs.mkdirSync(env.uploadDir, { recursive: true });
  }

  const filename = `${randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(env.uploadDir, filename), Buffer.from(base64Data, 'base64'));

  return `${env.publicUploadUrl}/${filename}`;
}
