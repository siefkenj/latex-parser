import { LatexPegParser as PegParser } from "./pegjs-parsers";
import {
    cleanEnumerateBody,
    processEnvironment,
    trim,
    trimEnvironmentContents,
} from "../libs/macro-utils";
import { attachMacroArgs, EnvInfo } from "../libs/ast";
import * as Ast from "../libs/ast-types";

import { printRaw } from "../libs/print-raw";

// A list of macros to be specially treated. The agument signature
// for these macros is given in the `xparse` syntax.
const SPECIAL_MACROS = {
    "\\": { signature: "!s o" },
    _: { signature: "m" },
    "^": { signature: "m" },
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
    // TeX commands
    parbox: { signature: "o o o m m" },
    // Preamble macros
    documentclass: { signature: "o m" },
    usepackage: { signature: "o m" },
    newcommand: { signature: "m o o m" },
    definecolor: { signature: "m m m" },
    // LaTeX commands
    includegraphics: { signature: "o m" },
    section: { signature: "s m" },
    subsection: { signature: "s m" },
    subsubsection: { signature: "s m" },
};

interface SpecialEnvSpec {
    [key: string]: EnvInfo;
}

const SPECIAL_ENVIRONMENTS: SpecialEnvSpec = {
    document: { processContent: trim },
    // Enumerate environments
    // XXX TODO, clean up these types
    enumerate: { signature: "o", processContent: cleanEnumerateBody as any },
    itemize: { signature: "o", processContent: cleanEnumerateBody as any },
    description: { signature: "o", processContent: cleanEnumerateBody as any },
    parts: { signature: "o", processContent: cleanEnumerateBody as any },
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
function processSpecialEnvironments(ast: Ast.Ast) {
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
function attachSpecialMacroArgs(ast: Ast.Ast) {
    ast = attachMacroArgs(ast, SPECIAL_MACROS);

    return ast;
}

/**
 * Recursively wraps all strings in the AST node in
 * a { type: "string", content: <original string> }
 * object.
 *
 * @param {*} node
 */
function wrapStrings(node: Ast.Ast | string): Ast.Ast {
    if (node == null) {
        return node;
    }
    if (typeof node === "string") {
        return { type: "string", content: node };
    }
    if (Array.isArray(node)) {
        return node.map(wrapStrings) as any;
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
        if (prop in ret) {
            (ret as any)[prop] = wrapStrings((ret as any)[prop]);
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
    (ast as any).content = trim((ast as any).content);
    ast = trimEnvironmentContents(ast);
    return ast;
}

export { parse, printRaw };
