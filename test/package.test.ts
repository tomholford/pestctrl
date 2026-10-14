import { expect, test } from "bun:test";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { withBuildLock } from "./build-lock.ts";

const root = join(import.meta.dir, "..");

test("the package zip has the extension at its root", async () => {
  await withBuildLock(async () => {
    const junk = [
      join(root, "extension/.DS_Store"),
      join(root, "extension/icons/.DS_Store"),
    ];
    for (const path of junk) writeFileSync(path, "");
    try {
      const proc = Bun.spawn(["bun", "run", "package"], {
        cwd: root,
        stdout: "pipe",
        stderr: "pipe",
      });
      const [code, stderr, stdout] = await Promise.all([
        proc.exited,
        new Response(proc.stderr).text(),
        new Response(proc.stdout).text(),
      ]);
      expect(code, stderr).toBe(0);

      const manifest = JSON.parse(readFileSync(join(root, "extension/manifest.json"), "utf8")) as {
        version: string;
      };
      const zipPath = join(root, "dist", `pestctrl-${manifest.version}.zip`);
      expect(stdout.trim().split("\n").at(-1)).toBe(zipPath);

      const list = Bun.spawn(["unzip", "-Z1", zipPath], { stdout: "pipe", stderr: "pipe" });
      const [listCode, names, listErr] = await Promise.all([
        list.exited,
        new Response(list.stdout).text(),
        new Response(list.stderr).text(),
      ]);
      expect(listCode, listErr).toBe(0);
      const files = names
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.endsWith("/"))
        .sort();
      expect(files).toEqual([
        "background.js",
        "icons/icon-128.png",
        "icons/icon-16.png",
        "icons/icon-32.png",
        "icons/icon-48.png",
        "manifest.json",
        "outlines.css",
      ]);
    } finally {
      for (const path of junk) rmSync(path, { force: true });
    }
  });
});
