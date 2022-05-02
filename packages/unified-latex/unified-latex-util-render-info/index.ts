import * as Ast from "../unified-latex-types";
import { visit } from "../unified-latex-util-visit";

/**
 * Updates the `._renderInfo` property on a node to include
 * whatever has been supplied to `renderInfo`. If `renderInfo`
 * is null, no update is performed.
 *
 * *This operation mutates `node`*
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
 * Removes any `_renderInfo` and `position` tags present in the AST. This
 * operation is _destructive_.
 */
export function trimRenderInfo(ast: Ast.Ast) {
    visit(ast, (node) => {
        if (node.type === "environment" || node.type === "mathenv") {
            node.env = trimRenderInfo(node.env) as Ast.Node[];
        }
        delete node._renderInfo;
        delete node.position;
    });
    return ast;
}
