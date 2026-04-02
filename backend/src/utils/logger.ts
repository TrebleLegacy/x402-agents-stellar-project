type LogMethod = (message: string) => void;

const info: LogMethod = (message) => console.log(`[INFO] ${message}`);
const debug: LogMethod = (message) => console.log(`[DEBUG] ${message}`);
const warn: LogMethod = (message) => console.warn(`[WARN] ${message}`);
const error: LogMethod = (message) => console.error(`[ERROR] ${message}`);

export const logger = {
  info,
  debug,
  warn,
  error,
};
