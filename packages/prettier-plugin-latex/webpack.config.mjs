/* eslint-env node */
import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import glob from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
    entry: {
        "index": "./src/index",
        "standalone": "./src/standalone",
    },
    mode: "development",
    devtool: "inline-source-map",
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist/prettier-plugin-latex/src"),
        library: { type: "umd", name: "PrettierPluginLatex" },
        globalObject: `(() => {
            if (typeof self !== 'undefined') {
                return self;
            } else if (typeof window !== 'undefined') {
                return window;
            } else if (typeof global !== 'undefined') {
                return global;
            } else {
                return Function('return this')();
            }
        })()`,
    },
    optimization: {
        splitChunks: { chunks: "all" },
    },
    module: {
        rules: [
            {
                test: /latex.pegjs$/,
                use: "pegjs-loader?allowedStartRules[]=document,allowedStartRules[]=math",
            },
            {
                test: /\.pegjs$/,
                exclude: /latex.pegjs$/,
                use: "pegjs-loader",
            },
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
                exclude: /node_modules/,
                options: { compilerOptions: { outDir: "./dist" } },
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
};
