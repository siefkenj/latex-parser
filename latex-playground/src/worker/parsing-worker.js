import * as Comlink from "comlink";
import * as latexParser from "../parser-utils/latex-parser";

import peg from "pegjs";

// Needed to print the prettier Doc
import prettierPluginBabel from "prettier/parser-babel";

// XXX globalThis needs a polyfill, otherwise CRA will silently error on build!
import globalthisgenrator from "globalthis";
var globalThis = globalthisgenrator();

const obj = {
    format(texInput, options = {}) {
        const output = latexParser.printPrettier(texInput, options);

        return output;
    },
    parse(texInput, options = {}) {
        const output = latexParser.parse(texInput, options);

        return output;
    },
    // There are extra parsers made for parsing the AST.
    // This function will first parse to an AST and then
    // run the additional parser.
    parseWithAstParser(
        texInput,
        options = {
            parser: "parseAlignEnvironment",
            parserSource: null,
        }
    ) {
        const { parser: parserName, parserSource } = options;

        // We are going to run PEG on an AST (instead of a string),
        // So first generate the AST
        let ast = null;
        try {
            ast = latexParser.parse(texInput, options);
        } catch (e) {
            e.message = "Failed to parse LaTeX source " + e.message;
            throw e;
        }

        // If `parserSource` is given, use Pegjs to generate a parser
        let parser = null;
        try {
            parser = peg.generate(parserSource);
        } catch (e) {
            e.message = "Failed to create Pegjs parser " + e.message;
            throw e;
        }

        // Before we run the parser, we want to pass in some functions
        // for manipulating ASTs. These are made global variables, because
        // there isn't another way to make them available to the parser...
        Object.assign(globalThis, latexParser.astParsers.utils);

        const output = parser.parse(
            latexParser.astParsers.utils.decorateArrayForPegjs(ast),
            {}
        );
        //const output = latexParser.astParsers[parserName](ast);
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
