export type LogLevel = "debug" | "info" | "warn" | "error";

const levelWeights: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getEnvLogLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (["debug", "info", "warn", "error"].includes(raw)) {
    return raw as LogLevel;
  }
  return "info";
}

const activeLevel: LogLevel = getEnvLogLevel();

export class Logger {
  constructor(private scope?: string) {}

  private shouldLog(level: LogLevel): boolean {
    return levelWeights[level] >= levelWeights[activeLevel];
  }

  private format(level: LogLevel, message: string, meta?: unknown): string {
    const ts = new Date().toISOString();
    const scope = this.scope ? `[${this.scope}]` : "";
    const base = `${ts} [${level.toUpperCase()}]${scope} ${message}`;
    if (meta === undefined) return base;
    try {
      const serialized =
        typeof meta === "string" ? meta : JSON.stringify(meta, null, 2);
      return `${base} | ${serialized}`;
    } catch {
      return `${base} | [unserializable meta]`;
    }
  }

  debug(message: string, meta?: unknown): void {
    if (!this.shouldLog("debug")) return;
    // eslint-disable-next-line no-console
    console.debug(this.format("debug", message, meta));
  }

  info(message: string, meta?: unknown): void {
    if (!this.shouldLog("info")) return;
    // eslint-disable-next-line no-console
    console.info(this.format("info", message, meta));
  }

  warn(message: string, meta?: unknown): void {
    if (!this.shouldLog("warn")) return;
    // eslint-disable-next-line no-console
    console.warn(this.format("warn", message, meta));
  }

  error(message: string, meta?: unknown): void {
    if (!this.shouldLog("error")) return;
    // eslint-disable-next-line no-console
    console.error(this.format("error", message, meta));
  }
}

export const logger = new Logger("YelpScraper");