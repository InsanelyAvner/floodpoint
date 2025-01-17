// src/args.ts
export function parseArgs(query: {
    [key: string]: string | string[] | undefined;
  }): number {
    const threads = query.threads;
    if (threads && typeof threads === "string" && !isNaN(parseInt(threads))) {
      return Math.min(parseInt(threads), 128);
    }
    return 8; // default value
  }
  