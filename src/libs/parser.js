import PegParser from "../PEG-grammar/latex.pegjs";
import {
    attachMacroArgs,
    cleanEnumerateBody,
    processEnvironment,
    trim,
    trimEnvironmentContents,
} from "./macro-utils";

import { printRaw } from "./print-raw";

// A list of macros to be specially treated. The agument signature
// for these macros is given in the `xparse` syntax.
const SPECIAL_MACROS = {
    "\\": { signature: "o" },
    mathbb: { signature: "m" },
    mathcal: { signature: "m" },
    mathscr: { signature: "m" },
    mathfrak: { signature: "m" },
    mathrm: { signature: "m" },
    textrm: { signature: "m", renderInfo: { inParMode: true } },
    textsf: { signature: "m", renderInfo: { inParMode: true } },
    texttt: { signature: "m", renderInfo: { inParMode: true } },
    textit: { signature: "m", renderInfo: { inParMode: true } },
    textsl: { signature: "m", renderInfo: { inParMode: true } },
    textsc: { signature: "m", renderInfo: { inParMode: true } },
    textbf: { signature: "m", renderInfo: { inParMode: true } },
    textlf: { signature: "m", renderInfo: { inParMode: true } },
    emph: { signature: "m", renderInfo: { inParMode: true } },
    textup: { signature: "m" },
    textnormal: { signature: "m" },
    uppercase: { signature: "m" },
    footnote: { signature: "m", renderInfo: { inParMode: true } },
    text: { signature: "m", renderInfo: { inMathMode: false } },
    frac: { signature: "m m" },
    item: { signature: "o", renderInfo: { hangingIndent: true } },
    // Preamble macros
    documentclass: { signature: "o m" },
    usepackage: { signature: "o m" },
    newcommand: { signature: "m o o m" },
    definecolor: { signature: "m m m" },
};

const SPECIAL_ENVIRONMENTS = {
    document: { processContent: trim },
    // Enumerate environments
    enumerate: { signature: "o", processContent: cleanEnumerateBody },
    itemize: { signature: "o", processContent: cleanEnumerateBody },
    description: { signature: "o", processContent: cleanEnumerateBody },
    parts: { signature: "o", processContent: cleanEnumerateBody },
    // Aligned environments
    tabular: { signature: "m", renderInfo: { alignContent: true } },
    tabularx: { signature: "m m", renderInfo: { alignContent: true } },
    // Math environments
    "equation*": { renderInfo: { inMathMode: true } },
    equation: { renderInfo: { inMathMode: true } },
    "align*": { renderInfo: { inMathMode: true, alignContent: true } },
    align: { renderInfo: { inMathMode: true, alignContent: true } },
    "alignat*": { renderInfo: { inMathMode: true, alignContent: true } },
    alignat: { renderInfo: { inMathMode: true, alignContent: true } },
    "gather*": { renderInfo: { inMathMode: true } },
    gather: { renderInfo: { inMathMode: true } },
    "multline*": { renderInfo: { inMathMode: true } },
    multline: { renderInfo: { inMathMode: true } },
    "flalign*": { renderInfo: { inMathMode: true, alignContent: true } },
    flalign: { renderInfo: { inMathMode: true, alignContent: true } },
    split: { renderInfo: { inMathMode: true } },
    math: { renderInfo: { inMathMode: true } },
    displaymath: { renderInfo: { inMathMode: true } },
    matrix: { renderInfo: { alignContent: true } },
    bmatrix: { renderInfo: { alignContent: true } },
    pmatrix: { renderInfo: { alignContent: true } },
    vmatrix: { renderInfo: { alignContent: true } },
    Bmatrix: { renderInfo: { alignContent: true } },
    Vmatrix: { renderInfo: { alignContent: true } },
    smallmatrix: { renderInfo: { alignContent: true } },
};

/**
 * A special environment is one that is listed in `SPECIAL_ENVIRONMENTS`,
 * which includes additional annotations and processing functions.
 *
 * @param {*} ast
 * @returns
 */
function processSpecialEnvironments(ast) {
    for (const [envName, envInfo] of Object.entries(SPECIAL_ENVIRONMENTS)) {
        ast = processEnvironment(ast, envName, envInfo);
    }

    return ast;
}

/**
 * Look for any special macros, grab their arguments, and
 * put them in the `.args` property.
 *
 * @param {*} ast
 * @returns
 */
function attachSpecialMacroArgs(ast) {
    for (const [macroName, macroInfo] of Object.entries(SPECIAL_MACROS)) {
        ast = attachMacroArgs(ast, macroName, macroInfo);
    }

    return ast;
}

/**
 * Recursively wraps all strings in the AST node in
 * a { type: "string", content: <original string> }
 * object.
 *
 * @param {*} node
 */
function wrapStrings(node) {
    if (node == null) {
        return node;
    }
    if (typeof node === "string") {
        return { type: "string", content: node };
    }
    if (Array.isArray(node)) {
        return node.map(wrapStrings);
    }
    // At this point, `node` must be an object
    // wrap strings that appear in children

    // We don't want the `content` of a type == macro
    // node to be wrapped, but wrap everything else
    let childProps = ["content", "args", "env"];
    switch (node.type) {
        case "macro":
            childProps = ["args"];
            break;
        case "comment":
        case "string":
        case "verb":
        case "verbatim":
            childProps = [];
            break;
        default:
            break;
    }

    const ret = { ...node };
    for (const prop of childProps) {
        if (ret[prop] != null) {
            ret[prop] = wrapStrings(ret[prop]);
        }
    }

    return ret;
}

/**
 * Parse the LeTeX string to an AST.
 *
 * @param {string} [str=""] - LaTeX string input
 * @returns - AST for LaTeX string
 */
function parse(str = "") {
    const pegAst = PegParser.parse(str);
    let ast = wrapStrings(pegAst);
    ast = attachSpecialMacroArgs(ast);
    ast = processSpecialEnvironments(ast);
    ast = trim(ast);
    ast = trimEnvironmentContents(ast);
    return ast;
}

export { parse, printRaw };
