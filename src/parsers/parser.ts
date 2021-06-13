import { LatexPegParser as PegParser } from "./pegjs-parsers";
import {
    cleanEnumerateBody,
    processEnvironment,
    trim,
    trimEnvironmentContents,
} from "../libs/macro-utils";
import { attachMacroArgs, EnvInfo, MacroInfo } from "../libs/ast";
import * as Ast from "../libs/ast-types";

import { printRaw } from "../libs/print-raw";
import {
    parseTikzEnvironment,
} from "./tikz-environment";

// A list of macros to be specially treated. The argument signature
// for these macros is given in the `xparse` syntax.
const SPECIAL_MACROS: SpecialMacroSpec = {
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
    footnote: { signature: "o m", renderInfo: { inParMode: true } },
    footnotemark: { signature: "o" },
    text: { signature: "m", renderInfo: { inMathMode: false } },
    frac: { signature: "m m" },
    item: { signature: "o", renderInfo: { hangingIndent: true } },
    // TeX commands
    parbox: { signature: "o o o m m" },
    framebox: { signature: "o o m" },
    input: { signature: "m" },
    include: { signature: "m" },
    // Preamble macros
    documentclass: { signature: "o m", renderInfo: { pgfkeysArgs: true } },
    usepackage: { signature: "o m", renderInfo: { pgfkeysArgs: true } },
    newcommand: { signature: "m o o m", renderInfo: { breakAround: true } },
    renewcommand: { signature: "m o o m", renderInfo: { breakAround: true } },
    newenvironment: { signature: "m o o m" },
    renewenvironment: { signature: "m o o m" },
    providecommand: { signature: "m o o m" },
    newtheorem: { signature: "m o m o" },
    definecolor: { signature: "m m m" },
    geometry: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    // LaTeX commands
    marginpar: { signature: "o m", renderInfo: { breakAround: true } },
    setlength: { signature: "m m", renderInfo: { breakAround: true } },
    hspace: { signature: "s m" },
    vspace: { signature: "s m", renderInfo: { breakAround: true } },
    ref: { signature: "s m" },
    cref: { signature: "s m" },
    pageref: { signature: "s m" },
    cpageref: { signature: "s m" },
    label: { signature: "m" },
    includegraphics: {
        signature: "o m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    part: { signature: "s o m", renderInfo: { breakAround: true } },
    chapter: { signature: "s o m", renderInfo: { breakAround: true } },
    section: { signature: "s o m", renderInfo: { breakAround: true } },
    subsection: { signature: "s o m", renderInfo: { breakAround: true } },
    subsubsection: { signature: "s o m", renderInfo: { breakAround: true } },
    paragraph: { signature: "s o m", renderInfo: { breakAround: true } },
    subparagraph: { signature: "s o m", renderInfo: { breakAround: true } },
    author: { signature: "m", renderInfo: { breakAround: true } },
    maketitle: { renderInfo: { breakAround: true } },
    appendix: { renderInfo: { breakAround: true } },
    doublespacing: { renderInfo: { breakAround: true } },
    singlespacing: { renderInfo: { breakAround: true } },
    noindent: { renderInfo: { breakAround: true } },
    smallskip: { renderInfo: { breakAround: true } },
    medskip: { renderInfo: { breakAround: true } },
    bigskip: { renderInfo: { breakAround: true } },
    printbibliography: { renderInfo: { breakAround: true } },
    addtocontents: { signature: "m m", renderInfo: { breakAround: true } },
    addcontentsline: { signature: "m m m", renderInfo: { breakAround: true } },
    contentsline: { signature: "m m m", renderInfo: { breakAround: true } },
    bibliography: { signature: "m", renderInfo: { breakAround: true } },
    bibliographystyle: { signature: "m", renderInfo: { breakAround: true } },
    caption: { signature: "m", renderInfo: { breakAround: true } },
    // Tikz
    tikz: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    pgfkeys: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    tikzoption: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    tikzstyle: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    usetikzlibrary: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    pgfplotsset: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    pgfplotstabletypeset: {
        signature: "o m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    // hyperref
    hypersetup: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    // nicematrix
    NiceMatrixOptions: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    mymacro: {
        signature: "o m o",
    },
};

interface SpecialEnvSpec {
    [key: string]: EnvInfo;
}
interface SpecialMacroSpec {
    [key: string]: MacroInfo;
}

const SPECIAL_ENVIRONMENTS: SpecialEnvSpec = {
    document: { processContent: trim },
    // Enumerate environments
    // XXX TODO, clean up these types
    enumerate: { signature: "o", processContent: cleanEnumerateBody },
    itemize: { signature: "o", processContent: cleanEnumerateBody },
    description: { signature: "o", processContent: cleanEnumerateBody },
    parts: { signature: "o", processContent: cleanEnumerateBody },
    table: { signature: "o" },
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
    // Typical amsthm environments
    theorem: { signature: "o" },
    lemma: { signature: "o" },
    definition: { signature: "o" },
    proposition: { signature: "o" },
    corollary: { signature: "o" },
    remark: { signature: "!o" },
    example: { signature: "!o" },
    // TikZ
    tikzpicture: {
        signature: "o",
        processContent: parseTikzEnvironment,
        renderInfo: { pgfkeysArgs: true, tikzEnvironment: true },
    },
    scope: {
        signature: "o",
        processContent: parseTikzEnvironment,
        renderInfo: { pgfkeysArgs: true, tikzEnvironment: true },
    },
    axis: { signature: "o", renderInfo: { pgfkeysArgs: true } },
    // nicematrix
    NiceTabular: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceMatrixBlock: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceArrayWithDelims: {
        signature: "m m o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    pNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    bNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    BNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    vNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    VNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    pNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    bNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    BNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    vNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    VNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
};

/**
 * A special environment is one that is listed in `SPECIAL_ENVIRONMENTS`,
 * which includes additional annotations and processing functions.
 *
 * @param {*} ast
 * @returns
 */
function processSpecialEnvironments(
    ast: Ast.Ast,
    specialEnvironments = SPECIAL_ENVIRONMENTS
) {
    for (const [envName, envInfo] of Object.entries(specialEnvironments)) {
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
function attachSpecialMacroArgs(ast: Ast.Ast, specialMacros = SPECIAL_MACROS) {
    ast = attachMacroArgs(ast, specialMacros);

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
 * @param - LaTeX string input
 * @returns - AST for LaTeX string
 */
function parse(
    str = "",
    options?: { macros?: SpecialMacroSpec; environments?: SpecialEnvSpec }
) {
    const specialMacros: SpecialMacroSpec = { ...SPECIAL_MACROS };
    const specialEnvironments: SpecialEnvSpec = { ...SPECIAL_ENVIRONMENTS };
    // Combine the special macros/environments with the passed in ones
    if (options) {
        const { macros, environments } = options;
        Object.assign(specialMacros, macros);
        Object.assign(specialEnvironments, environments);
    }

    const pegAst = PegParser.parse(str);
    let ast = wrapStrings(pegAst);
    ast = attachSpecialMacroArgs(ast, specialMacros);
    ast = processSpecialEnvironments(ast, specialEnvironments);
    (ast as any).content = trim((ast as any).content);
    ast = trimEnvironmentContents(ast);
    return ast;
}

export { parse, printRaw };
