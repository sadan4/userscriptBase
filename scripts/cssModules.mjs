// stolen from https://github.com/mhsdesign/esbuild-plugin-lightningcss-modules/tree/main
import { transform } from 'lightningcss';
import { createHash } from 'crypto';
import fs from "fs/promises";
import { dirname, join } from "path";

/**
 * A generic cssModules plugin for esbuild based on lightningcss
 * 
 * @param {Object=} options
 * @param {RegExp=} options.includeFilter
 * @param {RegExp=} options.excludeFilter
 * @param {import("lightningcss").TransformOptions["visitor"]=} options.visitor
 * @param {import("lightningcss").TransformOptions["targets"]=} options.targets
 * @param {import("lightningcss").TransformOptions["drafts"]=} options.drafts
 * @param {import("lightningcss").TransformOptions["customAtRules"]=} options.customAtRules
 * @param {import("lightningcss").CSSModulesConfig["pattern"]=} options.cssModulesPattern
 * @param {import("lightningcss").CSSModulesConfig=} options.cssModules
 * @return {import("esbuild").Plugin}
 */
const cssModules = (options = {}) => {
    return {
        name: "css-modules",
        setup: ({onLoad, onResolve, initialOptions}) => {
            const transpiledCssModulesMap = new Map()

            onResolve({filter: /^css-raw:\/\//}, ({path}) => {
                return {
                    namespace: "css-raw",
                    path
                }
            })

            onLoad({filter: /.*/, namespace: "css-raw"}, ({path}) => {
                const {code, resolveDir} = transpiledCssModulesMap.get(path);
                return {
                    loader: "text",
                    contents: code
                }
            })

            onResolve({filter: /^css-modules:\/\//}, ({path}) => {
                return {
                    namespace: "css-modules",
                    path,
                }
            })

            onLoad({filter: /.*/, namespace: "css-modules"}, ({path}) => {
                const {code, resolveDir} = transpiledCssModulesMap.get(path)
                return {
                    contents: code,
                    loader: initialOptions.loader?.[".css"] ?? "css",
                    resolveDir,

                }
            })

            onLoad({filter: options.includeFilter ?? /\.module\.css$/}, async ({path}) => {
                if (options.excludeFilter?.test(path)) {
                    return;
                }

                const rawCssBuffer = await fs.readFile(path)

                const cssModules = { pattern: options.cssModulesPattern ?? `[hash]_[local]`, ...options.cssModules }

                const { code, map, exports } = transform({
                    filename: path,
                    code: rawCssBuffer,
                    analyzeDependencies: false,
                    cssModules,
                    sourceMap: true,
                    targets: options.targets,
                    drafts: options.drafts,
                    visitor: options.visitor,
                    customAtRules: options.customAtRules,
                    // this way the correct relative path for the source map will be generated ;)
                    projectRoot: join(initialOptions.absWorkingDir || process.cwd(), initialOptions.outdir)
                });

                if (!exports) {
                    return;
                }

                const id = "css-modules:\/\/" + createHash("sha256").update(path).digest('base64url') + '.css'
                const guhhh_id = "css-raw:\/\/" + createHash("sha256").update(path).digest('base64url') + '.css'

                const finalCode = code.toString("utf8") + `/*# sourceMappingURL=data:application/json;base64,${map.toString("base64")} */`;

                const css_module = { code: finalCode, resolveDir: dirname(path) };
                transpiledCssModulesMap.set(
                    id,
                    css_module
                )
                transpiledCssModulesMap.set(
                    guhhh_id,
                    css_module
                )

                const quote = JSON.stringify;

                const escape = (string) => JSON.stringify(string).slice(1, -1)

                let contents = "";

                /** @type {Map<string, string>} */
                const dependencies = new Map()

                /** @param {String} path */
                const importDependency = (path) => {
                    if (dependencies.has(path)) {
                        return dependencies.get(path)
                    }
                    const dependenciesName = `dependency_${dependencies.size}`
                    // prepend dependeny to to the contents
                    contents = `import ${dependenciesName} from ${quote(path)}\n` + contents;
                    dependencies.set(path, dependenciesName)
                    return dependenciesName;
                }

                contents += `import ${quote(id)}\n`;
                contents += `export {default as code} from ${quote(guhhh_id)}\n`;
                contents += `export default {`;

                for (const [cssClassReadableName, cssClassExport] of Object.entries(exports)) {

                    let compiledCssClasses = `"${escape(cssClassExport.name)}`

                    if (cssClassExport.composes) {
                        for (const composition of cssClassExport.composes) {
                            switch (composition.type) {
                                case "local":
                                    compiledCssClasses += " " + escape(composition.name)
                                    break;
                            
                                case "global":
                                    compiledCssClasses += " " + escape(composition.name)
                                    break;

                                case "dependency":
                                    compiledCssClasses += ` " + ${importDependency(composition.specifier)}[${quote(composition.name)}] + "`
                                    break;
                            }
                        }
                    }

                    compiledCssClasses += `"`

                    contents += `${quote(cssClassReadableName)}:${compiledCssClasses},`
                }

                contents += "}"

                // https://github.com/evanw/esbuild/issues/2943#issuecomment-1439755408
                const emptyishSourceMap = "data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==";
                contents += `\n//# sourceMappingURL=${emptyishSourceMap}`

                return {
                    contents,
                    loader: "js",
                }
            })
        }    
    }
}

export { cssModules };
