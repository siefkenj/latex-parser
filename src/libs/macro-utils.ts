import { cleanEnumerateBody as unifiedCleanEnumerateBody } from "../unified-latex/unified-latex-ctan/utils/enumerate";
import {
    arrayJoin,
    splitOnCondition,
    splitOnMacro,
    unsplitOnMacro,
} from "../unified-latex/unified-latex-util-split";
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

export { splitOnMacro };

export { splitOnCondition };

export { unsplitOnMacro };

export { arrayJoin };

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
    ast = JSON.parse(JSON.stringify(ast));
    return unifiedCleanEnumerateBody(ast, itemName);
}

/**
 * Remove any whitespace from the start and end of environment bodies.
 *
 * @param {*} ast
 * @returns
 */
export function trimEnvironmentContents<T extends Ast.Ast>(ast: T): T {
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
    ) as T;
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
            (nodeList: Ast.Node[]) => {
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
