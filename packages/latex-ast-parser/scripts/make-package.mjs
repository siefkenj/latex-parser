/**
 * Autogenerate a package.json file for a release build.
 *
 * run with
 * ```
 * node scripts/make-package.ts
 * ```
 */
import fs from "node:fs/promises";

(async () => {
    const json = await fs.readFile("./package.json", "utf-8");
    const originalPackage = JSON.parse(json);

    /* eslint no-unused-vars: "off" */

    // We want to remove several fields from our development package.json
    // in order to construct our production one.
    const {
        private: _ignore,
        exports: _ignore2,
        files: _ignore3,
        jest: _ignore4,
        scripts: _ignore5,
        devDependencies: _ignore6,
        ...distPackage
    } = originalPackage;

    // by adding back "exports" in a clever way, we can allow for directory-style importing without
    // having to change the package type away from "module"
    distPackage.exports = {
        ".": "./latex-parser.js",
        "./*js": "./*js",
        "./*": {
            import: "./*/index.js",
            require: "./*/index.cjs",
            types: "./*/index.d.ts",
        },
    };

    await fs.mkdir("dist", { recursive: true });
    const filename = "dist/package.json";
    console.log("writing", filename);
    await fs.writeFile(filename, JSON.stringify(distPackage, null, 4), "utf-8");
})();

export {};
