/**
 * Structured Logger
 * Centralized logging with context
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogContext {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
  error?: Error;
}

const isDevelopment = process.env.NODE_ENV === "development";

const formatLog = (ctx: LogContext): string => {
  const { timestamp, level, context, message, data, error } = ctx;
  let log = `[${timestamp}] [${level}] [${context}] ${message}`;
  if (data) {
    log += ` | ${JSON.stringify(data)}`;
  }
  if (error) {
    log += ` | ${error.message}`;
    if (isDevelopment) {
      log += `\n${error.stack}`;
    }
  }
  return log;
};

export const logger = {
  debug: (context: string, message: string, data?: unknown) => {
    if (!isDevelopment) return;
    const log = formatLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.DEBUG,
      context,
      message,
      data,
    });
    console.debug(log);
  },

  info: (context: string, message: string, data?: unknown) => {
    const log = formatLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      context,
      message,
      data,
    });
    console.log(log);
  },

  warn: (context: string, message: string, data?: unknown) => {
    const log = formatLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      context,
      message,
      data,
    });
    console.warn(log);
  },

  error: (context: string, message: string, error?: Error, data?: unknown) => {
    const log = formatLog({
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      context,
      message,
      error,
      data,
    });
    console.error(log);
  },
};
