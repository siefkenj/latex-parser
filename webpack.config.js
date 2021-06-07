/* eslint-env node */
const path = require("path");

module.exports = {
    entry: {
        "latex-parser": "./src/parsers/latex-parser.ts",
    },
    mode: "development",
    devtool: "source-map",
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
        library: { type: "umd", name: "LatexParser" },
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
    module: {
        rules: [
            {
                test: /\.pegjs$/,
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
