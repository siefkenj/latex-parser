import * as Comlink from "comlink";
import * as latexParser from "../parser-utils/latex-parser";

const obj = {
    format(texInput, options = {}) {
        const output = latexParser.printPrettier(texInput, options);

        return output;
    },
    parse(texInput, options = {}) {
        const output = latexParser.parse(texInput, options);

        return output;
    },
};

Comlink.expose(obj);
