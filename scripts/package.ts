import { mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const extensionDir = join(root, "extension");

const manifest = JSON.parse(readFileSync(join(extensionDir, "manifest.json"), "utf8")) as {
  version?: unknown;
};
const version = manifest.version;
if (typeof version !== "string" || !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)) {
  throw new Error(
    `extension/manifest.json version must be major.minor.patch, got ${JSON.stringify(version)}`,
  );
}

const background = join(extensionDir, "background.js");
if (!statSync(background, { throwIfNoEntry: false })?.isFile()) {
  throw new Error("extension/background.js is missing. Run bun run build first.");
}

const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });
const zipPath = join(dist, `pestctrl-${version}.zip`);
rmSync(zipPath, { force: true });

const zip = Bun.spawn(
  ["zip", "-r", "-X", zipPath, ".", "-x", "*.DS_Store", "-x", "*/.DS_Store"],
  { cwd: extensionDir, stdout: "pipe", stderr: "pipe" },
);
const [zipCode, zipStderr] = await Promise.all([zip.exited, new Response(zip.stderr).text()]);
if (zipCode !== 0) {
  throw new Error(`zip failed (${zipCode}): ${zipStderr}`);
}

const listed = Bun.spawn(["unzip", "-Z1", zipPath], { stdout: "pipe", stderr: "pipe" });
const [listCode, listStdout, listStderr] = await Promise.all([
  listed.exited,
  new Response(listed.stdout).text(),
  new Response(listed.stderr).text(),
]);
if (listCode !== 0) {
  throw new Error(`unzip failed (${listCode}): ${listStderr}`);
}

const entries = listStdout
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0);
const files = entries.filter((entry) => !entry.endsWith("/"));
const required = [
  "manifest.json",
  "background.js",
  "outlines.css",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
];
for (const name of required) {
  if (!files.includes(name)) {
    throw new Error(`${zipPath} is missing ${name} at the archive root`);
  }
}
for (const name of files) {
  if (
    name.startsWith("extension/") ||
    name.split("/").includes("node_modules") ||
    name.endsWith(".map") ||
    name.endsWith(".DS_Store")
  ) {
    throw new Error(`${zipPath} contains ${name}`);
  }
}

console.log(zipPath);
