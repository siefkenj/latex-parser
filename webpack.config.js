const path = require("path");

module.exports = {
    entry: {
        //"latex-parser": "./src/latex-parser.js",
        //"latex-printer-prettier": "./src/latex-parser.js",
        "latex": "./src/latex.js"
    },
    mode: "development",
    devtool: "source-map",
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "dist"),
        library: "latex",
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
