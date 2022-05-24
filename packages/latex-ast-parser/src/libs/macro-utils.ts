import { decorateArrayForPegjs } from "@unified-latex/unified-latex-util-pegjs";
import {
    arrayJoin,
    splitOnCondition,
    splitOnMacro,
    unsplitOnMacro,
} from "@unified-latex/unified-latex-util-split";
import {
    walkAst,
    trimRenderInfo,
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

export function zip<T, U>(array1: T[], array2: U[]): [T, U][] {
    const ret: [T, U][] = [];
    const len = Math.min(array1.length, array2.length);
    for (let i = 0; i < len; i++) {
        ret.push([array1[i], array2[i]]);
    }
    return ret;
}

export { decorateArrayForPegjs };
