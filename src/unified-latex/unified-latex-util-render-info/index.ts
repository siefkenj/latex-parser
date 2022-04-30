import * as Ast from "../unified-latex-types";

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
