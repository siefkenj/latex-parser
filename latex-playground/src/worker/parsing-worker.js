import * as Comlink from "comlink";
import * as latexParser from "../parser-utils/latex-parser";
// Needed to print the prettier Doc
import prettierPluginBabel from "prettier/parser-babel";

const obj = {
    format(texInput, options = {}) {
        const output = latexParser.printPrettier(texInput, options);

        return output;
    },
    parse(texInput, options = {}) {
        const output = latexParser.parse(texInput, options);

        return output;
    },
    parseToDoc(texInput, options = {}) {
        const doc = latexParser.Prettier.__debug.printToDoc(texInput, {
            ...options,
            parser: "latex-parser",
            plugins: [latexParser.prettierPluginLatex],
        });

        const output = latexParser.Prettier.__debug.formatDoc(doc, {
            parser: "babel",
            plugins: [prettierPluginBabel],
        });

        return output;
    },
};

Comlink.expose(obj);
