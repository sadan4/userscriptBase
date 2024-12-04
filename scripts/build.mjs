// @ts-check
import esbuild from "esbuild";
import { context } from "esbuild";
import { cssModules } from "./cssModules.mjs";
import { readFileSync } from "fs";
const watch = process.argv.includes("--watch");

/**
 * @type  {esbuild.BuildOptions}
*/
const opts = {
    entryPoints: ["src/index.ts"],
    outdir: "dist",
    plugins: [cssModules()],
    minify: true,
    bundle: true,
    treeShaking: true,
    logLevel: "info",
    sourcemap: "inline",
    banner: {
        js: readFileSync("./static/header.js", "utf-8"),
    }
}

if(watch){
    const ctx = await context(opts);
    await ctx.watch();
} else {
    await esbuild.build(opts);
}
