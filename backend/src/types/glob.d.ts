declare module 'glob' {
  interface GlobOptions {
    absolute?: boolean;
    nodir?: boolean;
    cwd?: string;
    [key: string]: any;
  }
  export function glob(pattern: string, options?: GlobOptions): Promise<string[]>;
}
