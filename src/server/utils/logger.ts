import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels with colors
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
  },
  colors: {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'gray',
  },
};

// Winston color configuration
winston.addColors(customLevels.colors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label'],
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  logFormat,
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, metadata }) => {
    const metaObj = (metadata && typeof metadata === 'object') ? metadata : {};
    const meta = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj, null, 2) : '';
    return `[${timestamp}] ${level}: ${message} ${meta ? '\n' + meta : ''}`;
  })
);

// File format for production
const fileFormat = winston.format.combine(
  logFormat,
  winston.format.printf(({ level, message, timestamp, metadata, stack }) => {
    const metaObj = (metadata && typeof metadata === 'object') ? metadata : {};
    const meta = Object.keys(metaObj).length > 0 ? JSON.stringify(metaObj) : '';
    const logEntry: any = {
      timestamp,
      level,
      message,
      metadata: meta ? JSON.parse(meta) : {},
    };
    if (stack) {
      logEntry.stack = stack;
    }
    return JSON.stringify(logEntry);
  })
);

// Create transports based on environment
const getTransports = () => {
  const transports: winston.transport[] = [];

  // Console transport
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    })
  );

  // File transports
  if (process.env.NODE_ENV === 'production') {
    // Error logs
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 7, // Keep 7 days of logs
      })
    );

    // Combined logs
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 30, // Keep 30 days of logs
      })
    );
  }

  return transports;
};

// Create logger instance
export const logger = winston.createLogger({
  levels: customLevels.levels,
  transports: getTransports(),
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat,
    }),
  ],
});

// Logger interface for type safety
export interface LogMetadata {
  [key: string]: any;
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: string;
}

// Helper functions with metadata support
export const logFatal = (message: string, meta?: LogMetadata) => {
  logger.log('fatal', message, meta);
};

export const logError = (message: string, error?: Error | unknown, meta?: LogMetadata) => {
  const metadata = {
    ...meta,
    ...(error instanceof Error && {
      error: error.message,
      stack: error.stack,
    }),
  };
  logger.error(message, metadata);
};

export const logWarn = (message: string, meta?: LogMetadata) => {
  logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: LogMetadata) => {
  logger.info(message, meta);
};

export const logDebug = (message: string, meta?: LogMetadata) => {
  logger.debug(message, meta);
};

export const logTrace = (message: string, meta?: LogMetadata) => {
  logger.log('trace', message, meta);
};

// Specialized logging functions

export const logAuthEvent = (
  event: 'signup' | 'login' | 'logout' | 'verify_email' | 'password_reset',
  userId: string,
  meta?: LogMetadata
) => {
  logInfo(`Auth event: ${event}`, {
    ...meta,
    userId,
    event,
  });
};

export const logApiRequest = (
  method: string,
  endpoint: string,
  userId?: string,
  meta?: LogMetadata
) => {
  logDebug(`API request: ${method} ${endpoint}`, {
    ...meta,
    method,
    endpoint,
    userId,
  });
};

export const logApiResponse = (
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number,
  userId?: string,
  meta?: LogMetadata
) => {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  const message = `API response: ${method} ${endpoint} - ${statusCode}`;

  if (level === 'error') {
    logError(message, undefined, {
      ...meta,
      method,
      endpoint,
      statusCode,
      duration,
      userId,
    });
  } else if (level === 'warn') {
    logWarn(message, {
      ...meta,
      method,
      endpoint,
      statusCode,
      duration,
      userId,
    });
  } else {
    logInfo(message, {
      ...meta,
      method,
      endpoint,
      statusCode,
      duration,
      userId,
    });
  }
};

export const logDatabaseQuery = (query: string, duration: number, meta?: LogMetadata) => {
  logDebug(`Database query executed`, {
    ...meta,
    query: query.substring(0, 200), // Limit query log length
    duration,
  });
};

export const logEmailEvent = (
  type: 'sent' | 'failed' | 'bounced',
  email: string,
  subject: string,
  meta?: LogMetadata
) => {
  const logFn = type === 'failed' ? logError : logInfo;
  logFn(`Email ${type}: ${subject} to ${email}`, {
    ...meta,
    type,
    email,
    subject,
  });
};

export const logSecurityEvent = (
  event: 'rate_limit' | 'invalid_token' | 'suspicious_activity',
  meta?: LogMetadata
) => {
  logWarn(`Security event: ${event}`, {
    ...meta,
    event,
  });
};

export default logger;
