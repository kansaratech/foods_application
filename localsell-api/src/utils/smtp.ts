type EmailConfiguration = {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean | null;
  smtpUser?: string | null;
  email?: string | null;
  emailPassword?: string | null;
};

export function smtpOptions(config: EmailConfiguration) {
  const host = config.smtpHost?.trim().toLowerCase() || 'smtp.gmail.com';
  const gmail = host === 'smtp.gmail.com';
  const port = config.smtpPort ?? (gmail ? 465 : 587);
  if (gmail && port !== 465 && port !== 587) {
    throw new Error('Gmail SMTP requires port 465 (SSL/TLS) or 587 (STARTTLS).');
  }
  return {
    host,
    port,
    secure: gmail ? port === 465 : (config.smtpSecure ?? false),
    ...(gmail && port === 587 ? { requireTLS: true } : {}),
    auth: {
      user: config.smtpUser?.trim() || config.email?.trim() || undefined,
      // Google displays app passwords in groups separated by spaces.
      pass: gmail ? config.emailPassword?.replace(/\s/g, '') : config.emailPassword || undefined,
    },
  };
}
