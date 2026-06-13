import { build } from "esbuild";

await build({
  entryPoints: ["src/feetback/script.ts"],
  outfile: "public/feetback.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2021"],
  minify: true,
  sourcemap: true,
  legalComments: "none",
  logLevel: "info",
});
