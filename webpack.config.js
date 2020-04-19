/* eslint-env node */
const path = require("path");

module.exports = {
    entry: {
        "latex-parser": "./src/latex-parser.js",
    },
    mode: "development",
    devtool: "source-map",
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
        library: "latex",
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
        libraryTarget: "umd",
    },
    module: {
        rules: [
            {
                test: /\.pegjs$/,
                use: "pegjs-loader",
            },
        ],
    },
};
