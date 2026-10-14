import { closeSync, openSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const lockPath = join(import.meta.dir, "..", ".build.lock");

// bun test runs files at the same time, and the build writes one outfile.
export async function withBuildLock<T>(run: () => Promise<T>): Promise<T> {
  const started = Date.now();
  let fd: number | undefined;
  while (fd === undefined) {
    try {
      fd = openSync(lockPath, "wx");
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "EEXIST") throw error;
      if (Date.now() - started > 30_000) {
        throw new Error("timed out waiting for .build.lock");
      }
      await Bun.sleep(20);
    }
  }
  try {
    return await run();
  } finally {
    closeSync(fd);
    unlinkSync(lockPath);
  }
}
