import { printRaw } from "./parser";

const ARGUMENT = { type: "argument", content: [], openMark: "", closeMark: "" };

/**
 * Walk the AST and replace a node with `callback(node)` whenever
 * `callbackTrigger(node)` returns true.
 *
 * @param {object} ast
 * @param {function} callback
 * @param {function} [callbackTrigger=() => false]
 * @param {{triggerTime: string}} - "early" indicates that `callback` is called before `walkAst` recurses down the tree. "late" calls `callback` after it has recursed.
 * @returns {object}
 */
export function walkAst(
    ast,
    callback,
    callbackTrigger = () => false,
    options = { triggerTime: "early" }
) {
    function reapply(node) {
        return walkAst(node, callback, callbackTrigger);
    }

    if (ast == null) {
        // Early or late, we callback right before getting a null value
        if (callbackTrigger(ast)) {
            return callback(ast);
        }
        return ast;
    }

    if (options.triggerTime === "early") {
        if (callbackTrigger(ast)) {
            ast = callback(ast);
        }
    }

    if (Array.isArray(ast)) {
        ast = ast.map(reapply);
        // run `callback` after recursion for "late" trigger
        if (options.triggerTime === "late") {
            if (callbackTrigger(ast)) {
                ast = callback(ast);
            }
        }
        return ast;
    }

    // We don't want to recursively apply to the `content`
    // of all types (e.g., comments and macros), so specify
    // a blacklist.
    let childProps = ["content", "args"];
    switch (ast.type) {
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

    let ret = { ...ast };
    for (const prop of childProps) {
        if (ret[prop] != null) {
            ret[prop] = reapply(ret[prop]);
        }
    }
    // run `callback` after recursion for "late" trigger
    if (options.triggerTime === "late") {
        if (callbackTrigger(ret)) {
            ret = callback(ret);
        }
    }

    return ret;
}

/**
 * Removes any `_renderInfo` tags present in the AST.
 *
 * @export
 * @param {*} ast
 * @returns
 */
export function trimRenderInfo(ast) {
    return walkAst(
        ast,
        (node) => {
            const ret = { ...node };
            delete ret._renderInfo;
            return ret;
        },
        (node) => node != null && node._renderInfo != null
    );
}

/**
 * Upates the `._renderInfo` property on a node to include
 * whatever has been supplied to `renderInfo`. If `renderInfo`
 * is null, no update is performed.
 *
 * *This operation is destructive*
 *
 * @param {*} node
 * @param {object|null} renderInfo
 * @returns
 */
function updateRenderInfo(node, renderInfo) {
    if (renderInfo != null) {
        node._renderInfo = { ...(node._renderInfo || {}), ...renderInfo };
    }
    return node;
}

/**
 * Returns true if a `\documentclass` macro is detected,
 * which would indicate that the node list contains the preamble.
 *
 * @param {[object]} nodes
 */
export function hasPreambleCode(nodes) {
    return nodes.some((node) => match.macro(node, "documentclass"));
}

/**
 * Split an `xparse` macro signature into signatures
 * for its individual arguments.
 *
 * @export
 * @param {string} [signature="m"]
 * @returns {[string]}
 */
export function splitXparseSignature(signature = "m") {
    // TODO: make this function actually correct according ot the xparse spec
    return signature.replace(/\s+/g, "").split("");
}

/**
 * Gobble an argument of type `argType`. `argType` should be the xparse
 * signature.
 *
 * @export
 * @param {object} ast
 * @param {string} argType
 * @returns
 */
export function gobbleSingleArgument(ast, argType) {
    const ret = { arg: null, gobbledTokens: 0 };
    let currIndex = 0;
    // gobble whitespace from currIndex onward, updated currIndex.
    function gobbleWhitespace() {
        while (currIndex < ast.length && ast[currIndex].type === "whitespace") {
            currIndex++;
        }
    }
    // Find out the index of the next token matching `bracket`.
    // Returns `null` if no such token exists.
    function findNext(bracket) {
        let index = currIndex;
        while (
            index < ast.length &&
            (ast[index].type !== "string" || ast[index].content !== bracket)
        ) {
            index++;
        }
        if (index === ast.length) {
            return null;
        }
        return index;
    }
    switch (argType) {
        // Mandatory argument in {...}
        case "m":
            gobbleWhitespace();
            if (
                ast[currIndex] != null &&
                !match.parbreak(ast[currIndex]) &&
                !match.comment(ast[currIndex])
            ) {
                const arglist = {
                    ...ARGUMENT,
                    content: ast[currIndex],
                    openMark: "{",
                    closeMark: "}",
                };
                if (arglist.content.type === "group") {
                    // If the arglist was specified as a group already,
                    // unwrap it. Otherwise we will be printing "{{...}}"
                    // instead of "{...}".
                    arglist.content = arglist.content.content;
                }
                // Make sure the content is always an array
                if (!Array.isArray(arglist.content)) {
                    arglist.content = [arglist.content];
                }
                ret.arg = arglist;
                ret.gobbledTokens = currIndex + 1;
            }
            break;
        // Optional argument in [...]
        case "o":
            gobbleWhitespace();
            if (
                ast[currIndex] != null &&
                ast[currIndex].type === "string" &&
                ast[currIndex].content === "["
            ) {
                // We've found the start of an optional argument
                currIndex++;
                const start = currIndex;
                const closingBraceIndex = findNext("]");
                if (closingBraceIndex != null) {
                    // We've found the end of an optional argument
                    const arglist = {
                        ...ARGUMENT,
                        content: ast.slice(start, closingBraceIndex),
                        openMark: "[",
                        closeMark: "]",
                    };
                    ret.arg = arglist;
                    ret.gobbledTokens = closingBraceIndex + 1;
                }
            }
            break;
        // Optional star ("*")
        case "s":
            gobbleWhitespace();
            if (
                ast[currIndex] != null &&
                ast[currIndex].type === "string" &&
                ast[currIndex].content === "*"
            ) {
                // We've found a star
                const arglist = {
                    ...ARGUMENT,
                    content: ast[currIndex],
                    openMark: "",
                    closeMark: "",
                };
                ret.arg = arglist;
                ret.gobbledTokens = currIndex + 1;
            }
            break;
    }
    return ret;
}

/**
 * Functions to match different types of nodes.
 */
const match = {
    macro(node, macroName) {
        if (node == null) {
            return false;
        }
        if (node.type === "macro" && node.content === macroName) {
            return true;
        }
        return false;
    },
    environment(node, envName) {
        if (node == null) {
            return false;
        }
        if (
            (node.type === "environment" || node.type === "mathenv") &&
            printRaw(node.env) === envName
        ) {
            return true;
        }
        return false;
    },
    comment(node) {
        if (node == null) {
            return false;
        }
        if (node.type === "comment") {
            return true;
        }
        return false;
    },
    parbreak(node) {
        if (node == null) {
            return false;
        }
        if (node.type === "parbreak") {
            return true;
        }
        return false;
    },
    whitespace(node) {
        if (node == null) {
            return false;
        }
        if (node.type === "whitespace") {
            return true;
        }
        return false;
    },
    string(node, value) {
        if (node == null) {
            return false;
        }
        if (
            node.type === "string" &&
            (value == null || node.content === value)
        ) {
            return true;
        }
        return false;
    },
};

/**
 * Searh (in a right-associative way) through the array for instances of
 * `macroName` and attach arguments to the macro. Argument signatures are
 * specified by `macroInfo.signature`.
 *
 * Info stored in `macroInfo.renderInfo` will be attached to the node
 * with attribute `_renderInfo`.
 *
 * @param {[object]} ast
 * @param {string} macroName
 * @param {object} macroInfo
 * @returns {[object]}
 */
function attachMacroArgsInArray(ast, macroName, macroInfo) {
    // Some preliminaries that are only used if `ast` is an array.
    let currIndex;
    function gobbleUntilMacro() {
        // Step backwards until we find the required macro
        while (currIndex >= 0 && !match.macro(ast[currIndex], macroName)) {
            currIndex--;
        }
    }

    // Search for an occurrence of `macroName` and its arguments.
    // Some macros are right-associative, so we should start searching from
    // the right
    currIndex = ast.length - 1;
    while (currIndex >= 0) {
        gobbleUntilMacro();
        if (currIndex < 0) {
            // We didn't find an occurrence of the macro
            return ast;
        }
        // Store the currIndex, which is where the macro is. Start searching
        // for its arguments at the next index.
        const macroIndex = currIndex;
        const macro = ast[macroIndex];
        // Add `._renderInfo` if we have any
        updateRenderInfo(macro, macroInfo.renderInfo);
        if (macro.args != null) {
            currIndex = macroIndex - 1;
            continue;
            // XXX we don't want to search for macro arguments if we already
            // found them.
        }
        const args = [];
        currIndex++;
        // At this point, we've found the macro, so collect its arguments
        for (const signature of splitXparseSignature(macroInfo.signature)) {
            const gobbledArg = gobbleSingleArgument(
                ast.slice(currIndex),
                signature
            );
            currIndex += gobbledArg.gobbledTokens;
            if (gobbledArg.gobbledTokens > 0) {
                // If we actually found an argument, add it to the list
                args.push(gobbledArg.arg);
            }
        }
        if (args.length > 0) {
            // If we found arguments, we need to attach them to the macro
            const newMacro = { ...macro, args };
            ast = ast
                .slice(0, macroIndex)
                .concat([newMacro])
                .concat(ast.slice(currIndex));
        }
        // After we've gobbled the arguments, set
        // ourselves one space before the macro so we can continue.
        currIndex = macroIndex - 1;
    }

    return ast;
}

/**
 * Recursively search for and attach the arguments for a
 * particular macro to its AST node. `macroInfo` should
 * contain a `signature` property which specifies the arguments
 * signature in xparse syntax.
 *
 * @param {object} ast
 * @param {string} macroName
 * @param {object} macroInfo
 * @returns - a new AST
 */
export function attachMacroArgs(ast, macroName, macroInfo) {
    // We only gobble arguments when we find a macro in an array, so
    // recurse looking for arrays and then gobble.
    return walkAst(
        ast,
        (node) => {
            // attach the macro's arguments to its `.args` property
            return attachMacroArgsInArray(node, macroName, macroInfo);
        },
        (node) => Array.isArray(node),
        { triggerTime: "late" }
    );
}

/**
 * Trims whitespace and parbreaks from the start and end
 * of an array.
 *
 * @export
 * @param {[object]} ast
 * @returns {[object]}
 */
export function trim(ast) {
    if (!Array.isArray(ast)) {
        console.warn("Trying to trim a non-array ast", ast);
        return ast;
    }
    if (ast.length === 0) {
        return ast;
    }

    let leftTrim = 0;
    let rightTrim = 0;

    // Find the padding on the left
    for (const node of ast) {
        if (match.whitespace(node) || match.parbreak(node)) {
            leftTrim++;
        } else {
            break;
        }
    }

    // Find the padding on the right
    for (let i = ast.length - 1; i >= 0; i--) {
        const node = ast[i];
        if (match.whitespace(node) || match.parbreak(node)) {
            rightTrim++;
        } else {
            break;
        }
    }

    if (leftTrim === 0 && rightTrim === 0) {
        return ast;
    }

    const ret = ast.slice(leftTrim, ast.length - rightTrim);
    // Special care must be taken because the content could have a comment
    // in it. If the comment was on the same line as a parskip, it will no
    // longer be on the same line after the trimming. Thus, we must modify
    // the comment.
    if (
        ret.length > 0 &&
        leftTrim > 0 &&
        ret[0].type === "comment" &&
        ret[0].sameline
    ) {
        const comment = ret.shift();
        ret.unshift({ ...comment, sameline: false });
    }

    return ret;
}

/**
 * Split an array of AST nodes based on a macro. An object `{segments: [], macros: []}`
 * is returned. The original array is reconstructed as
 * `segments[0] + macros[0] + segments[1] + ...`.
 *
 * @param {[object]} ast
 * @param {(string|[string])} macroName
 * @returns {{segments: [object], macros: [object]}}
 */
export function splitOnMacro(ast, macroName) {
    if (!Array.isArray(macroName)) {
        const { segments, separators } = split(ast, (node) =>
            match.macro(node, macroName)
        );
        return { segments, macros: separators };
    }

    const { segments, separators } = split(ast, (node) =>
        macroName.some((name) => match.macro(node, name))
    );
    return { segments, macros: separators };
}

/**
 * Split a list of nodes based on whether `splitFunc` returns `true`.
 *
 * @param {[object]} nodes
 * @param {function} [splitFunc=() => false]
 * @returns {{segments: [object], separators: [object]}}
 */
function split(nodes, splitFunc = () => false) {
    if (!Array.isArray(nodes)) {
        throw new Error(`Can only split an Array, not ${nodes}`);
    }

    const segments = [];
    const separators = [];
    let currentSegment = [];

    for (const node of nodes) {
        if (splitFunc(node)) {
            segments.push(currentSegment);
            separators.push(node);
            currentSegment = [];
        } else {
            currentSegment.push(node);
        }
    }
    segments.push(currentSegment);

    return { segments, separators };
}

/**
 * Does the reverse of splitOnMacro
 *
 * @param {{segments: [[object]], macros: [[object]]}} { segments, macros }
 * @returns {[object]}
 */
export function unsplitOnMacro({ segments, macros }) {
    if (segments.length === 0) {
        console.warn("Trying to join zero segments");
        return [];
    }
    if (segments.length !== macros.length + 1) {
        console.warn(
            "Mismatch between lengths of macros and segments when trying to unsplit"
        );
    }

    let ret = segments[0];
    for (let i = 0; i < macros.length; i++) {
        // Even though the type of macros[i] is node and not array,
        // Array.concat still works
        ret = ret.concat(macros[i]).concat(segments[i + 1]);
    }

    return ret;
}

/**
 * Clean up any whitespace issues in an enumerate environment. In particular,
 *      * Remove any leading or ending whitespace
 *      * Ensure there is a par between occurrences of `\item`
 *      * Ensure there is whitespace after each occurrence of `\item` provided there is content there
 * `itemName` can be used to set what the "item" macro is called.
 *
 * This function attaches content following a `\item` to the `\item` macro with
 * `openMark` and `closeMark` set to empty. This allows hanging-indents to be rendered.
 *
 * @param {[object]} ast
 * @param {string} [itemName="item"]
 * @returns {[object]}
 */
export function cleanEnumerateBody(ast, itemName = "item") {
    let { segments, macros } = splitOnMacro(ast, itemName);
    // Trim the content of each block, but make sure there is a space
    // between each macro and the content. Since the first segment of content
    // appears *before* any macro, don't add a space there.
    segments = segments
        .map(trim)
        .map((content, i) =>
            i === 0 || content.length === 0
                ? content
                : [{ type: "whitespace" }].concat(content)
        );

    // We want a trailing indent for the `\item` nodes. We will
    // do this with a trick: we will add an argument to the index node
    // with openMark=" " and closeMark=""
    macros = macros.map((node, i) => {
        const segment = segments[i + 1];
        const newNode = { ...node };
        newNode.args = [
            ...(newNode.args || []),
            {
                type: "argument",
                content: segment,
                openMark: "",
                closeMark: "",
            },
        ];
        updateRenderInfo(newNode, { inParMode: true });
        return newNode;
    });

    // We want a parbreak between each `\item` block and the preceding
    // content. We may or may not start with content, so act accordingly
    if (segments[0].length === 0) {
        macros = macros.map((macro, i) =>
            i === 0 ? macro : [{ type: "parbreak" }, macro]
        );
    } else {
        macros = macros.map((macro) => [{ type: "parbreak" }, macro]);
    }

    return [].concat(segments[0], ...macros);
}

/**
 * Recursively search for and process an environment. Arguments are
 * consumed according to the `signature` specified. The body is processed
 * with the specified `processContent` function (if specified). Any specified `renderInfo`
 * is attached to the environment node.
 *
 * @param {object} ast
 * @param {string} envName
 * @param {object} envInfo
 * @returns - a new AST
 */
export function processEnvironment(ast, envName, envInfo) {
    return walkAst(
        ast,
        (node) => {
            const ret = { ...node };
            // XXX Should process the environment arguments here!

            updateRenderInfo(ret, envInfo.renderInfo);
            if (typeof envInfo.processContent === "function") {
                // process the body of the environment if a processing function was supplied
                ret.content = envInfo.processContent(ret.content);
            }
            if (typeof envInfo.processNode === "function") {
                // process the node itself if a processing function was supplied
                envInfo.processNode(ret);
            }

            return ret;
        },
        (node) => match.environment(node, envName)
    );
}

/**
 * Add `_renderInfo.startNode` and `_renderInfo.endNode` properties
 * to the first and last nodes of an array. This operation is destructive.
 *
 * @export
 * @param {*} ast
 * @returns
 */
export function tagStartAndEndNodes(ast) {
    return walkAst(
        ast,
        (array) => {
            if (array.length > 0) {
                updateRenderInfo(array[0], { startNode: true });
                updateRenderInfo(array[array.length - 1], { endNode: true });
            }
            return array;
        },
        (node) => Array.isArray(node)
    );
}

/**
 * Remove any whitespace from the start and end of environment bodies.
 *
 * @param {*} ast
 * @returns
 */
export function trimEnvironmentContents(ast) {
    return walkAst(
        ast,
        (node) => {
            const ret = { ...node };
            ret.content = trim(ret.content);

            return ret;
        },
        (node) => node != null && node.type === "environment"
    );
}

/**
 * Generate a datastructure that can be queried
 * for the next/previous node. This allows for "peeking"
 * during the rendering process.
 *
 * @class ReferenceMap
 */
export class ReferenceMap {
    constructor(ast) {
        this.ast = ast;
        this.map = new Map();
        walkAst(
            this.ast,
            (node) => {
                for (let i = 0; i < node.length; i++) {
                    this.map.set(node[i], {
                        previous: node[i - 1],
                        next: node[i + 1],
                    });
                }
                return node;
            },
            (node) => Array.isArray(node)
        );
    }
    getPreviousNode(node) {
        return (this.map.get(node) || {}).previous;
    }
    getNextNode(node) {
        return (this.map.get(node) || {}).next;
    }
}

/**
 * Splits a tabular environment based on `rowSepMacros` and `colSep` strings.
 *
 * @export
 * @param {*} ast
 * @param {string} [colSep=["&"]]
 * @param {string} [rowSepMacros=["\\", "hline", "cr"]]
 * @returns {{rows: [{cells: [object], seps: [string]}], rowSeps: [object]}}
 */
export function splitTabular(
    ast,
    colSep = ["&"],
    rowSepMacros = ["\\", "hline", "cr"]
) {
    if (!Array.isArray(ast)) {
        throw new Error(
            `Expecting Array when splitting a tabular environment, not ${ast}`
        );
    }
    const { segments: rows, macros: rowSeps } = splitOnMacro(ast, rowSepMacros);

    const ret = { rows: [], rowSeps };
    for (const row of rows) {
        let { segments: cols, separators: colSeps } = split(row, (node) =>
            colSep.some((sep) => match.string(node, sep))
        );
        ret.rows.push({
            cells: cols.map(trim),
            seps: colSeps,
        });
    }

    return ret;
}

/**
 * Adds `_renderInfo.alignedContent = true` to the specified node.
 *
 * @export
 * @param {object} node
 * @returns {object}
 */
export function markAlignEnv(node) {
    console.log("XXXX marking");
    return updateRenderInfo(node, { alignedContent: true });
}
