import * as Ast from "../ast-types";
import { walkAst } from "./walkers";
import { match } from "./matchers";

/**
 * Removes any `_renderInfo` and `position` tags present in the AST.
 *
 * @export
 * @param {*} ast
 * @returns
 */
export function trimRenderInfo(ast: Ast.Ast) {
    return walkAst(
        ast,
        (node) => {
            const { _renderInfo, position, ...ret } = node;
            if (ret.type === "environment" || ret.type === "mathenv") {
                ret.env = trimRenderInfo(ret.env) as Ast.Node[];
            }
            if (_renderInfo != null || position != null) {
                return ret;
            }
            return node;
        },
        ((node) => node != null) as Ast.TypeGuard<Ast.Node>
    );
}

/**
 * Updates the `._renderInfo` property on a node to include
 * whatever has been supplied to `renderInfo`. If `renderInfo`
 * is null, no update is performed.
 *
 * *This operation is destructive*
 *
 * @param {*} node
 * @param {object|null} renderInfo
 * @returns
 */
export function updateRenderInfo(
    node: Ast.Node,
    renderInfo: object | null | undefined
) {
    if (renderInfo != null) {
        node._renderInfo = { ...(node._renderInfo || {}), ...renderInfo };
    }
    return node;
}

/**
 * List all child attributes of the current node that should be processed
 * in math mode or not in math mode. If math mode is not specified in the node's render
 * info, empty lists are returned.
 */
export function listMathChildren(node: Ast.Ast): {
    enter: string[];
    leave: string[];
} {
    const NULL_RETURN = { enter: [], leave: [] };
    if (Array.isArray(node)) {
        return NULL_RETURN;
    }
    if (match.math(node)) {
        // When we enter a math environment, our content is always
        // considered math mode
        return { enter: ["content"], leave: [] };
    }

    const renderInfo: { inMathMode?: boolean } = node._renderInfo || {};
    if (renderInfo.inMathMode == null) {
        return NULL_RETURN;
    }
    if (match.macro(node)) {
        if (renderInfo.inMathMode === true) {
            return { enter: ["args"], leave: [] };
        } else {
            return { enter: [], leave: ["args"] };
        }
    }
    if (match.environment(node)) {
        if (renderInfo.inMathMode === true) {
            return { enter: ["content"], leave: [] };
        } else {
            return { enter: [], leave: ["content"] };
        }
    }
    return NULL_RETURN;
}
