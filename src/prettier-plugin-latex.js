import Prettier from "prettier/standalone";
import { parse, printRaw } from "./latex-parser";
import { ReferenceMap, hasPreambleCode } from "./macro-utils";

const ESCAPE = "\\";

// Commands to build the prettier syntax tree
const {
    concat,
    group,
    conditionalGroup,
    fill,
    ifBreak,
    breakParent,
    join,
    line,
    softline,
    hardline,
    literalline,
    lineSuffix,
    lineSuffixBoundary,
    indent,
    dedent,
    align,
    markAsRoot,
    dedentToRoot,
} = Prettier.doc.builders;

/**
 * Join an array with `softline`. However, if a `line` is
 * found, do not insert an additional softline. For example
 * `[a, b, c]` -> `[a, softline, b, softline, c]`
 *
 * but
 *
 * `[a, line, b, c]` -> `[a, line, b, softline, c]`
 *
 * @param {*} arr
 * @returns
 */
function joinWithSoftline(arr) {
    if (arr.length === 0 || arr.length === 1) {
        return arr;
    }
    const ret = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
        const prevNode = arr[i - 1];
        const nextNode = arr[i];
        if (nextNode.type !== "line" && prevNode.type !== "line") {
            ret.push(softline);
        }
        ret.push(nextNode);
    }
    return ret;
}

/**
 * Print a `.type === macro` node. `mode` can be
 *  - `"tree"` - print the argument hierarchically (with content nested between open marks and closed marks) and return a prettier object.
 *  - `"flat"` - print as a flat list (not wrapped in a prettier object)
 *
 * @param {*} path
 * @param {function} print
 * @param {string} [mode="tree"]
 * @returns
 */
function printMacro(path, print, mode = "tree") {
    const node = path.getValue();
    let args = [];
    if (node.args != null) {
        // If the macro has been marked as inParMode,
        // it should render inline as if it is part of regular text.
        // To do this, we print the arguments and extract the contents.
        if (node._renderInfo && node._renderInfo.inParMode) {
            // gather all the args flat-printed
            args = path.map(
                (subPath) => printArgument(subPath, print, "flat"),
                "args"
            );
        } else {
            args = path.map(print, "args");
        }
    }
    // An array with all the prettier commands to be rendered by a `fill` or `concat`
    const flatBody = [].concat([ESCAPE, printRaw(node.content)], ...args);

    if (mode === "tree") {
        if (node._renderInfo && node._renderInfo.hangingIndent) {
            return indent(concat(flatBody));
        }
        return concat(flatBody);
    }
    if (mode === "flat") {
        return flatBody;
    }
}

/**
 * Print a `.type === arguments` node. `mode` can be
 *  - `"tree"` - print the argument hierarchically (with content nested between open marks and closed marks) and return a prettier object.
 *  - `"flat"` - print as a flat list (not wrapped in a prettier object)
 *
 * @param {*} path
 * @param {function} print
 * @param {string} [mode="tree"]
 * @returns
 */
function printArgument(path, print, mode = "tree") {
    const node = path.getValue();
    if (mode === "tree") {
        return concat([
            node.openMark,
            path.call(print, "content"),
            node.closeMark,
        ]);
    }
    if (mode === "flat") {
        return [].concat(
            node.openMark,
            path.map(print, "content"),
            node.closeMark
        );
    }
}

function printLatexAst(path, options, print) {
    const node = path.getValue();

    let breakOnAllLines = false;
    if (path.getName() == null) {
        // We're at the root, so make a map of the ast so that we can
        // "peek" to find previous and next siblings during rendering
        options.referenceMap = new ReferenceMap(node);

        if (Array.isArray(node) && hasPreambleCode(node)) {
            // If we are rendering the preamble, we want to put newlines instead
            // of spaces.
            breakOnAllLines = true;
        }
    }

    if (node == null) {
        return node;
    }
    if (typeof node === "string") {
        return node;
    }
    if (Array.isArray(node)) {
        // If we are directly handed an array to print, we assume it should
        // be printed in paragraph mode. Therefore we should request the "flat"
        // versions of certain node types so they can all be rendered in the
        // same `fill`.
        const printFlatVersion = (subPath) => {
            const node = subPath.getValue();
            if (node.type === "macro") {
                const content = [].concat(...printMacro(path, print, "flat"));
                if (node._renderInfo && node._renderInfo.hangingIndent) {
                    return indent(fill(content));
                }
            }
            return print(subPath);
        };
        let content = null;
        if (options.inMathMode) {
            // In math mode, whitespace is completely ignored, so we may wrap at any time
            content = joinWithSoftline(path.map(printFlatVersion));
        } else {
            content = path.map(printFlatVersion);
        }

        const formatFunc = breakOnAllLines ? concat : fill;

        return formatFunc([].concat(...content));
    }

    // tmp variables
    let content = null;
    let args = null;
    switch (node.type) {
        case "argument":
            return printArgument(path, print, "tree");
        case "comment":
            if (node.sameline) {
                if (node.suffixParbreak) {
                    return concat([lineSuffix("%" + printRaw(node.content))]);
                }
                return concat([
                    lineSuffix("%" + printRaw(node.content)),
                    lineSuffixBoundary,
                ]);
            }
            return "\n%" + printRaw(node.content) + "\n";
        case "commentenv":
        case "environment":
        case "mathenv":
        case "verbatim":
            var env = printRaw(node.env);
            var envStart = ESCAPE + "begin{" + env + "}";
            var envEnd = ESCAPE + "end{" + env + "}";
            var argsString = node.args == null ? "" : printRaw(node.args);

            // The environment might switch modes if an `inMathMode` property is supplied
            if (node._renderInfo && node._renderInfo.inMathMode != null) {
                const prevMathMode = options.inMathMode;
                options.inMathMode = node._renderInfo.inMathMode;
                content = path.call(print, "content");
                options.inMathMode = prevMathMode;
            } else {
                content = path.call(print, "content");
            }

            // If we are a startNode or we are preceded by a parskip,
            // we don't want a forced newline at the start.
            var startToken = [hardline];
            if (
                (node._renderInfo && node._renderInfo.startNode) ||
                (options.referenceMap &&
                    (options.referenceMap.getPreviousNode(node) || {}).type ===
                        "parbreak")
            ) {
                startToken = [];
            }

            if (node.content.length === 0) {
            // If the environment has no content, we want to print an empty body,
            // not a parskip
                return concat(
                    startToken.concat([envStart, argsString, hardline, envEnd])
                );
            }

            return concat(
                startToken.concat([
                    envStart,
                    argsString,
                    indent(concat([hardline, content])),
                    hardline,
                    envEnd,
                ])
            );
        case "displaymath":
            // use the `options` object to pass information about the current state
            // to the recursive call to `print`.
            options.inMathMode = true;
            content = path.call(print, "content");
            options.inMathMode = false;

            return concat([
                hardline,
                ESCAPE + "[",
                indent(concat([hardline, content])),
                hardline,
                ESCAPE + "]",
            ]);
        case "group":
            return concat(["{", printRaw(node.content), "}"]);
        case "inlinemath":
            options.inMathMode = true;
            content = path.call(print, "content");
            options.inMathMode = false;

            return concat(["$", content, "$"]);
        case "macro":
            if (
                node._renderInfo &&
                node._renderInfo.inParMode &&
                !node._renderInfo.hangingIndent
            ) {
                return printMacro(path, print, "flat");
            }
            return printMacro(path, print, "tree");
        case "parbreak":
            return concat([hardline, hardline]);
        case "string":
            return node.content;
        case "subscript":
            // TODO we should pre-process to add groups instead
            if (node.content.type !== "group") {
                // We always want a script to be surrounded by a group
                return concat(["_", "{", path.call(print, "content"), "}"]);
            }
            return concat(["_", path.call(print, "content")]);
        case "superscript":
            // TODO we should pre-process to add groups instead
            if (node.content.type !== "group") {
                // We always want a script to be surrounded by a group
                return concat(["^", "{", path.call(print, "content"), "}"]);
            }
            return concat(["^", path.call(print, "content")]);
        case "verb":
            return concat([
                ESCAPE,
                node.env,
                node.escape,
                printRaw(node.content),
                node.escape,
            ]);
        case "whitespace":
            return line;
        default:
            console.warn("Printing unknown type", node);
            return printRaw(node);
    }
}

export const languages = [
    {
        name: "latex",
        extensions: [".tex"],
        parsers: ["latex-parser"],
    },
];

export const parsers = {
    "latex-parser": {
        parse,
        astFormat: "latex-ast",
        locStart: () => 0,
        locEnd: () => 1,
    },
};

export const printers = {
    "latex-ast": {
        print: printLatexAst,
    },
};
