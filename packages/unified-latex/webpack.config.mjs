/* eslint-env node */
import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import glob from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));

const entries = Object.fromEntries(
    glob
        .sync("unified-latex*/index*")
        .map((tsName) => [tsName.replace(/\.ts$/, ""), "./" + tsName])
);
// Add things which don't conform to the naming convention
Object.assign(entries, {
    "structured-clone/index": "./structured-clone/index.ts",
});

const emsConfig = {
    entry: entries,
    mode: "development",
    devtool: "inline-source-map",
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist/"),
        library: { type: "module" },
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
        //splitChunks: { chunks: "all" },
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
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    experiments: {
        outputModule: true,
    },
};

export default [
    emsConfig,
    {
        ...emsConfig,
        output: {
            filename: "[name].cjs",
            path: path.resolve(__dirname, "dist/"),
            library: { type: "commonjs" },
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
    },
];
