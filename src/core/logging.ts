/**
 * Request logger — maps from Python `core/logging.py`.
 *
 * Preserves the original design intent: per-request log files written into a
 * date-based folder structure using UTC timestamps, keyed by a request hash.
 * The Node-idiomatic mechanism differs from Python's logging-module handler
 * dance, but the on-disk outcome is the same:
 *
 *   {logPath}/{YYYY-MM-DD}/{apiName}/{HH-MM-SS}_{hash}.log
 *
 * getLogger() returns a small handler with info/debug/error methods plus
 * close(); call close() at the end of a request (the services layer does this)
 * to release the file descriptor — the equivalent of removeHandler().
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from './config';

export interface RequestLogHandler {
  baseFileName: string;
  info(message: string): void;
  debug(message: string): void;
  error(message: string): void;
  close(): void;
}

export class RequestLogger {
  private readonly logPath: string;
  private readonly logLevel: string;

  constructor() {
    this.logPath =
      config.appEnvironment.toLowerCase() === 'dev'
        ? config.logPathDev
        : config.logPathProd;
    this.logLevel = config.logLevel;
  }

  getLogger(apiName: string, hash: string): RequestLogHandler {
    const now = new Date();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const timestamp = now.toISOString().slice(11, 19).replace(/:/g, '-'); // HH-MM-SS (UTC)

    const logFolder = path.join(this.logPath, today, apiName.toLowerCase());
    fs.mkdirSync(logFolder, { recursive: true });

    const baseFileName = path.join(logFolder, `${timestamp}_${hash}.log`);

    const levelRank: Record<string, number> = {
      critical: 50,
      error: 40,
      warning: 30,
      info: 20,
      debug: 10,
    };
    const threshold = levelRank[this.logLevel.toLowerCase()] ?? 20;

    const write = (level: string, message: string): void => {
      if ((levelRank[level] ?? 20) < threshold) return;
      // Timestamps inside log lines are UTC, matching the Python formatter.
      const line = `${new Date().toISOString()} - ${level.toUpperCase()} - ${message}\n`;
      fs.appendFileSync(baseFileName, line);
    };

    return {
      baseFileName,
      info: (m: string) => write('info', m),
      debug: (m: string) => write('debug', m),
      error: (m: string) => write('error', m),
      close: () => {
        /* fs.appendFileSync opens/closes per call; nothing to release. */
      },
    };
  }
}
