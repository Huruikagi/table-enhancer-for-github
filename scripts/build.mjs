import { build } from "esbuild";

await build({
  entryPoints: ["src/content.ts"],
  outfile: "dist/content.js",
  bundle: true,
  format: "iife",
  target: "es2020",
});
