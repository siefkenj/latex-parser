import PegParser from "./PEG-grammar/latex.pegjs";
import {
    attachMacroArgs,
    cleanEnumerateBody,
    processEnvironment,
    trim,
    tagStartAndEndNodes,
    trimEnvironmentContents,
} from "./macro-utils";

// A list of macros to be specially treated. The agument signature
// for these macros is given in the `xparse` syntax.
const SPECIAL_MACROS = {
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
    // Math environments
    "equation*": { renderInfo: { inMathMode: true } },
    equation: { renderInfo: { inMathMode: true } },
    "align*": { renderInfo: { inMathMode: true } },
    align: { renderInfo: { inMathMode: true } },
    "alignat*": { renderInfo: { inMathMode: true } },
    alignat: { renderInfo: { inMathMode: true } },
    "gather*": { renderInfo: { inMathMode: true } },
    gather: { renderInfo: { inMathMode: true } },
    "multline*": { renderInfo: { inMathMode: true } },
    multline: { renderInfo: { inMathMode: true } },
    "flalign*": { renderInfo: { inMathMode: true } },
    flalign: { renderInfo: { inMathMode: true } },
    split: { renderInfo: { inMathMode: true } },
    math: { renderInfo: { inMathMode: true } },
    displaymath: { renderInfo: { inMathMode: true } },
};

const ESCAPE = "\\";

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
 * Renders the AST to a string without any pretty printing.
 *
 * @param {*} node
 */
function printRaw(node) {
    if (typeof node === "string") {
        return node;
    }
    if (Array.isArray(node)) {
        return node.map(printRaw).join("");
    }
    // tmp variables
    let argsString = "";
    switch (node.type) {
        case "argument":
            return node.openMark + printRaw(node.content) + node.closeMark;
        case "comment":
            var suffix = node.suffixParbreak ? "" : "\n";
            if (node.sameline) {
                return "%" + printRaw(node.content) + suffix;
            }
            return "\n%" + printRaw(node.content) + suffix;
        case "commentenv":
        case "environment":
        case "mathenv":
        case "verbatim":
            var env = printRaw(node.env);
            var envStart = ESCAPE + "begin{" + env + "}";
            var envEnd = ESCAPE + "end{" + env + "}";
            argsString = node.args == null ? "" : printRaw(node.args);
            return envStart + argsString + printRaw(node.content) + envEnd;
        case "displaymath":
            return ESCAPE + "[" + printRaw(node.content) + ESCAPE + "]";
        case "group":
            return "{" + printRaw(node.content) + "}";
        case "inlinemath":
            return "$" + printRaw(node.content) + "$";
        case "macro":
            argsString = node.args == null ? "" : printRaw(node.args);
            return ESCAPE + printRaw(node.content) + argsString;
        case "parbreak":
            return "\n\n";
        case "string":
            return node.content;
        case "subscript":
            if (node.content.type === "group") {
                // Groups are already wrapped in {...}. We don't want
                // to double do it!
                return "_" + printRaw(node.content);
            }
            return "_{" + printRaw(node.content) + "}";
        case "superscript":
            if (node.content.type === "group") {
                // Groups are already wrapped in {...}. We don't want
                // to double do it!
                return "^" + printRaw(node.content);
            }
            return "^{" + printRaw(node.content) + "}";
        case "verb":
            return (
                ESCAPE +
                node.env +
                node.escape +
                printRaw(node.content) +
                node.escape
            );
        case "whitespace":
            return " ";

        default:
            console.warn(
                "Cannot find render for node ",
                node,
                `(of type ${typeof node})`
            );
            return "" + node;
    }
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
    ast = tagStartAndEndNodes(ast);
    return ast;
}

export { parse, printRaw };
