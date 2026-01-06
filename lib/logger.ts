/**
 * 環境に応じたロガー
 * - production: error のみ出力
 * - development: すべて出力
 */

const isDev = process.env.NODE_ENV !== 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * 名前付きロガーを作成
 * @example
 * const log = createLogger('api:images');
 * log.debug('processing request'); // [api:images] processing request
 */
export function createLogger(prefix: string): Logger {
  const fmt = (level: LogLevel, args: unknown[]) => {
    const timestamp = new Date().toISOString();
    return [`[${timestamp}] [${level.toUpperCase()}] [${prefix}]`, ...args];
  };

  return {
    debug: (...args) => {
      if (isDev) console.log(...fmt('debug', args));
    },
    info: (...args) => {
      if (isDev) console.info(...fmt('info', args));
    },
    warn: (...args) => {
      // warn は本番でも出力
      console.warn(...fmt('warn', args));
    },
    error: (...args) => {
      // error は常に出力
      console.error(...fmt('error', args));
    },
  };
}

// 共通ロガーインスタンス
export const logger = createLogger('app');

// エクスポート用の便利関数
export const log = {
  debug: (...args: unknown[]) => logger.debug(...args),
  info: (...args: unknown[]) => logger.info(...args),
  warn: (...args: unknown[]) => logger.warn(...args),
  error: (...args: unknown[]) => logger.error(...args),
};
