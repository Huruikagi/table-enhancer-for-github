import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import manifest from "../public/manifest.json" with { type: "json" };

const rootDir = resolve(import.meta.dirname, "..");
const distDir = join(rootDir, "dist");
const releaseDir = join(rootDir, "release");
const version = manifest.version;
const zipName = `table-enhancer-for-github-v${version}.zip`;
const zipPath = join(releaseDir, zipName);
const quotePowerShellString = (value) => `'${value.replaceAll("'", "''")}'`;

if (!version) {
  throw new Error("public/manifest.json must define a version before packaging.");
}

if (!existsSync(join(distDir, "manifest.json"))) {
  throw new Error("dist/manifest.json not found. Run pnpm build before packaging.");
}

mkdirSync(releaseDir, { recursive: true });
rmSync(zipPath, { force: true });

const result =
  process.platform === "win32"
    ? spawnSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory(${quotePowerShellString(distDir)}, ${quotePowerShellString(zipPath)}, [System.IO.Compression.CompressionLevel]::Optimal, $false)`,
        ],
        { cwd: rootDir, stdio: "inherit" },
      )
    : spawnSync("zip", ["-r", zipPath, "."], { cwd: distDir, stdio: "inherit" });

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  throw new Error(`Packaging failed with exit code ${result.status}.`);
}

console.log(`Packaged ${zipPath}`);
