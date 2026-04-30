// Structured logger — logs in development, silent in production.
// Use this everywhere instead of console.log so you can control
// output in one place and add remote logging later without touching call sites.

const isDev = process.env.NODE_ENV !== 'production';

type LogLevel = 'info' | 'warn' | 'error';

const format = (level: LogLevel, context: string, message: string) =>
  `[${level.toUpperCase()}] [${context}] ${message}`;

export const logger = {
  info: (context: string, message: string, data?: unknown) => {
    if (!isDev) return;
    console.log(format('info', context, message), data ?? '');
  },

  warn: (context: string, message: string, data?: unknown) => {
    if (!isDev) return;
    console.warn(format('warn', context, message), data ?? '');
  },

  error: (context: string, message: string, error?: unknown) => {
    // Always log errors — even in production
    console.error(format('error', context, message), error ?? '');
    // TODO: send to remote logging (e.g. Sentry) here when ready:
    // Sentry.captureException(error);
  },
};