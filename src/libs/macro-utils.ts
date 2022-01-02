import {
    walkAst,
    trimRenderInfo,
    updateRenderInfo,
    match,
    trim,
    processEnvironment,
} from "./ast";
import * as Ast from "./ast-types";

export { trimRenderInfo, match, trim, processEnvironment };

/**
 * Returns true if a `\documentclass` macro is detected,
 * which would indicate that the node list contains the preamble.
 *
 * @param {[object]} nodes
 */
export function hasPreambleCode(nodes: Ast.Node[]) {
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
export function splitOnMacro(
    ast: Ast.Node[],
    macroName: string | string[]
): { segments: Ast.Ast[][]; macros: Ast.Macro[] } {
    if (typeof macroName === "string") {
        macroName = [macroName];
    }
    if (!Array.isArray(macroName)) {
        throw new Error("Type coercion failed");
    }
    const isSeparator = match.createMacroMatcher(macroName);
    const { segments, separators } = split(ast, isSeparator);
    return { segments, macros: separators as Ast.Macro[] };
}

/**
 * Split a list of nodes based on whether `splitFunc` returns `true`.
 *
 * @param {[object]} nodes
 * @param {function} [splitFunc=() => false]
 * @returns {{segments: [object], separators: [object]}}
 */
function split(
    nodes: Ast.Node[],
    splitFunc: (node: Ast.Ast) => boolean = () => false
): { segments: Ast.Ast[][]; separators: Ast.Ast } {
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
export function unsplitOnMacro({
    segments,
    macros,
}: {
    segments: Ast.Ast[][];
    macros: Ast.Node[] | Ast.Node[][];
}) {
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
export function cleanEnumerateBody(ast: Ast.Node[], itemName = "item") {
    let { segments, macros } = splitOnMacro(ast, itemName);
    // Trim the content of each block, but make sure there is a space
    // between each macro and the content. Since the first segment of content
    // appears *before* any macro, don't add a space there.
    segments = (segments as Ast.Node[][])
        .map(trim)
        .map((content, i) =>
            i === 0 || (content as any[]).length === 0
                ? content
                : [{ type: "whitespace" }].concat(content)
        ) as Ast.Ast[][];

    // We want a trailing indent for the `\item` nodes. We will
    // do this with a trick: we will add an argument to the index node
    // with openMark=" " and closeMark=""
    let body: any[] = macros.map((node, i) => {
        const segment = segments[i + 1];
        const newNode = { ...node } as Ast.Macro;
        newNode.args = [
            ...(newNode.args || []),
            {
                type: "argument",
                content: segment,
                openMark: "",
                closeMark: "",
            } as Ast.Argument,
        ];
        updateRenderInfo(newNode, { inParMode: true });
        return newNode;
    });

    // We want a parbreak between each `\item` block and the preceding
    // content. We may or may not start with content, so act accordingly
    if (segments[0].length === 0) {
        body = body.map((macro, i) =>
            i === 0 ? macro : [{ type: "parbreak" }, macro]
        );
    } else {
        body = body.map((macro) => [{ type: "parbreak" }, macro]);
    }

    return [].concat(segments[0] as any, ...body);
}

/**
 * Remove any whitespace from the start and end of environment bodies.
 *
 * @param {*} ast
 * @returns
 */
export function trimEnvironmentContents(ast: Ast.Ast) {
    return walkAst(
        ast,
        (node) => {
            const ret = { ...node };
            // If the first thing in the environment is a sameline comment,
            // we actually want to start trimming *after* it.
            let firstNode = ret.content[0];
            if (match.comment(firstNode) && firstNode.sameline) {
                firstNode = { ...firstNode, suffixParbreak: false };
                ret.content = [firstNode, ...trim(ret.content.slice(1))];
            } else {
                ret.content = trim(ret.content);
            }

            return ret;
        },
        ((node: any) =>
            node != null &&
            (node.type === "environment" ||
                node.type === "inlinemath" ||
                node.type === "displaymath" ||
                node.type === "mathenv")) as Ast.TypeGuard<
            Ast.Environment | Ast.InlineMath
        >
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
    ast: Ast.Ast;
    map: Map<
        Ast.Ast,
        { previous?: Ast.Ast; next?: Ast.Ast; renderCache?: any }
    >;

    constructor(ast: Ast.Ast) {
        this.ast = ast;
        this.map = new Map();
        walkAst(
            this.ast,
            (nodeList: Ast.Ast[]) => {
                for (let i = 0; i < nodeList.length; i++) {
                    this.map.set(nodeList[i], {
                        previous: nodeList[i - 1],
                        next: nodeList[i + 1],
                    });
                }
                return nodeList;
            },
            Array.isArray
        );
    }

    /**
     * Associate render-specific data with this node. This data
     * will be overwritten if `setRenderCache` is called twice.
     *
     * @param {Ast.Ast} node
     * @param {*} data
     * @memberof ReferenceMap
     */
    setRenderCache(node: any, data: any): void {
        const currData = this.map.get(node) || {};
        this.map.set(node, { ...currData, renderCache: data });
    }

    /**
     * Retrieve data associated with `node` via `setRenderCache`
     *
     * @param {Ast.Ast} node
     * @returns {(object | undefined)}
     * @memberof ReferenceMap
     */
    getRenderCache(node: any): object | any[] | undefined {
        return this.map.get(node)?.renderCache;
    }

    getPreviousNode(node: Ast.Ast): Ast.Node | undefined {
        return (this.map.get(node) || ({} as any)).previous;
    }

    getNextNode(node: Ast.Ast): Ast.Node | undefined {
        return (this.map.get(node) || ({} as any)).next;
    }
}

/**
 * Adds `_renderInfo.alignedContent = true` to the specified node.
 *
 * @export
 * @param {object} node
 * @returns {object}
 */
export function markAlignEnv(node: Ast.Node) {
    return updateRenderInfo(node, { alignedContent: true });
}

type StringlikeArray = any[] & string;

/**
 * Pegjs operates on strings. However, strings and arrays are very similar!
 * This function adds `charAt`, `charCodeAt`, and `substring` methods to
 * `array` so that `array` can then be fed to a Pegjs generated parser.
 *
 * @param {[object]} array
 * @returns {[object]}
 */
export function decorateArrayForPegjs(array: any[]): StringlikeArray {
    (array as any).charAt = function (i: number) {
        return this[i];
    };
    // We don't have a hope of imitating `charCodeAt`, so
    // make it something that won't interfere
    (array as any).charCodeAt = () => 0;
    (array as any).substring = function (i: number, j: number) {
        return this.slice(i, j);
    };
    // This function is called when reporting an error,
    // so we convert back to a string.
    (array as any).replace = function (a: string, b: string) {
        const ret = JSON.stringify(this);
        return ret.replace(a, b);
    };
    return array as StringlikeArray;
}

export function zip<T, U>(array1: T[], array2: U[]): [T, U][] {
    const ret: [T, U][] = [];
    const len = Math.min(array1.length, array2.length);
    for (let i = 0; i < len; i++) {
        ret.push([array1[i], array2[i]]);
    }
    return ret;
}
