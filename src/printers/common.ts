import Prettier from "prettier/standalone";
import { ReferenceMap, zip, match } from "../libs/macro-utils";
import * as Ast from "../libs/ast-types";
import * as PrettierTypes from "./prettier-types";
import { printRaw } from "../parsers/parser";

/**
 * Computes the environment name, start/end, and args.
 * E.g., for "\begin{x}abc\end{x}", it returns
 * ```
 * {
 *  envName: "x",
 *  start: "\\begin{x}",
 *  end: "\\end{x}",
 * }
 * ```
 *
 * @param {*} node
 * @returns
 */
export function formatEnvSurround(node: Ast.Environment) {
    const env = printRaw(node.env);

    return {
        envName: env,
        start: ESCAPE + "begin{" + env + "}",
        end: ESCAPE + "end{" + env + "}",
    };
}

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
export function joinWithSoftline(arr: any[]) {
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

export function getNodeInfo(
    node: any,
    options: PrettierTypes.Options & { referenceMap?: ReferenceMap }
): {
    renderInfo: any;
    renderCache?: object;
    previousNode?: Ast.Node;
    nextNode?: Ast.Node;
    referenceMap?: ReferenceMap;
} {
    const renderInfo = node._renderInfo || {};
    const previousNode =
        options.referenceMap && options.referenceMap.getPreviousNode(node);
    const nextNode =
        options.referenceMap && options.referenceMap.getNextNode(node);
    const renderCache =
        options.referenceMap && options.referenceMap.getRenderCache(node);
    // It's useful to know whether we're the start or end node in an array,
    // so compute this information.
    return {
        renderInfo,
        renderCache,
        previousNode,
        nextNode,
        referenceMap: options.referenceMap,
    };
}

export const ESCAPE = "\\";

// Commands to build the prettier syntax tree
export const {
    concat,
    group,
    fill,
    ifBreak,
    line,
    softline,
    hardline,
    lineSuffix,
    lineSuffixBoundary,
    indent,
    markAsRoot,
} = ((Prettier as any).doc as PrettierTypes.doc).builders;

/**
 * Given an array of nodes and the corresponding printed versions, prepares
 * a final Doc array. This function does things like ensures there are `hardlines`
 * around environments and that there aren't excess hardlines at the start or end.
 * It also unwraps `inParMode` macro contents.
 *
 * @export
 * @param {Ast.Node[]} nodes
 * @param {PrettierTypes.Doc[]} docArray
 * @param {*} options
 * @returns {PrettierTypes.Doc[]}
 */
export function formatDocArray(
    nodes: Ast.Node[],
    docArray: PrettierTypes.Doc[],
    options: any
): PrettierTypes.Doc[] {
    const ret: PrettierTypes.Doc[] = [];

    for (let i = 0; i < nodes.length; i++) {
        const rawNode = nodes[i];
        const printedNode = docArray[i];
        const {
            renderInfo,
            referenceMap,
            previousNode,
            nextNode,
        } = getNodeInfo(rawNode, options);
        const renderCache =
            referenceMap && referenceMap.getRenderCache(rawNode);

        switch (rawNode.type) {
            case "comment":
                // Comments don't insert hardlines themselves; they depend on appropriate
                // hardlines being inserted here.

                // This comment printer inserts hardlines after comments, so do not insert
                // a hardline before a comment if there is a comment right before.
                if (
                    !rawNode.sameline &&
                    previousNode &&
                    !match.comment(previousNode)
                ) {
                    ret.push(hardline);
                }
                ret.push(printedNode);
                if (nextNode && !rawNode.suffixParbreak) {
                    ret.push(hardline);
                }
                break;
            case "environment":
            case "displaymath":
                // Environments always start on a new line (unless they are the first
                // item). Peek to see if there is a newline inserted already.
                if (previousNode && previousNode?.type !== "parbreak") {
                    if (ret[ret.length - 1] === line) {
                        // A preceding `line` should be converted into a `hardline`.
                        // Remove the line so a hardline can be added
                        ret.pop();
                    }
                    if (ret[ret.length - 1] !== hardline) {
                        ret.push(hardline);
                    }
                }
                ret.push(printedNode);
                // If an environment is followed by whitespace, replace it with a hardline
                // instead
                if (nextNode?.type === "whitespace") {
                    ret.push(hardline);
                    i++;
                }

                break;
            case "macro":
                // Macros marked as `inParMode` should be unwrapped
                // unless they have a hanging indent, in which case the macro
                // has already be wrapped in an `indent` block
                if (renderInfo.inParMode && !renderInfo.hangingIndent && renderCache) {
                    ret.push(
                        (renderCache as any).content,
                        ...((renderCache as any).rawArgs || [])
                    );
                } else {
                    ret.push(printedNode);
                }
                break;
            case "parbreak":
                ret.push(hardline, hardline);
                break;
            default:
                ret.push(printedNode);
                break;
        }
    }

    return ret;
}
