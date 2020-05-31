import { walkAst, trimRenderInfo, updateRenderInfo, match, trim, processEnvironment } from "./ast";

export { trimRenderInfo, match, trim, processEnvironment };

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
        (node) =>
            node != null &&
            (node.type === "environment" ||
                node.type === "inlinemath" ||
                node.type === "displaymath" ||
                node.type === "mathenv")
    );
}

/**
 * Generate a data structure that can be queried
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
 * Adds `_renderInfo.alignedContent = true` to the specified node.
 *
 * @export
 * @param {object} node
 * @returns {object}
 */
export function markAlignEnv(node) {
    return updateRenderInfo(node, { alignedContent: true });
}

/**
 * Pegjs operates on strings. However, strings and arrays are very similar!
 * This function adds `charAt`, `charCodeAt`, and `substring` methods to
 * `array` so that `array` can then be fed to a Pegjs generated parser.
 *
 * @param {[object]} array
 * @returns {[object]}
 */
export function decorateArrayForPegjs(array) {
    array.charAt = function (i) {
        return this[i];
    };
    // We don't have a hope of imitating `charCodeAt`, so
    // make it something that won't interfere
    array.charCodeAt = () => 0;
    array.substring = function (i, j) {
        return this.slice(i, j);
    };
    // This function is called when reporting an error,
    // so we convert back to a string.
    array.replace = function (a, b) {
        const ret = JSON.stringify(this);
        return ret.replace(a, b);
    };
    return array;
}
