import { build } from "esbuild";

function getBuildMode(argv, env) {
  const modeIndex = argv.indexOf("--mode");
  const modeValue = modeIndex >= 0 ? argv[modeIndex + 1] : undefined;
  const inlineMode = argv.find((arg) => arg.startsWith("--mode="))?.slice("--mode=".length);

  const requestedMode = inlineMode ?? modeValue ?? env.BUILD_MODE ?? env.NODE_ENV ?? "production";

  if (["development", "dev"].includes(requestedMode)) {
    return "development";
  }

  if (["production", "prod"].includes(requestedMode)) {
    return "production";
  }

  throw new Error(`Unsupported build mode: ${requestedMode}. Use "development" or "production".`);
}

const mode = getBuildMode(process.argv.slice(2), process.env);
const isDevelopment = mode === "development";

await build({
  entryPoints: ["src/content.ts", "src/page-data.ts"],
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "es2020",
  sourcemap: isDevelopment,
  minify: !isDevelopment,
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode),
  },
});

console.log(`Built Chrome extension content script in ${mode} mode.`);
