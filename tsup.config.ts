import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/utils.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  minify: false,
  splitting: false,
  treeshake: true,
  target: "es2020",
});
