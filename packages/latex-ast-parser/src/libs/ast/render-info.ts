import * as Ast from "../ast-types";
import { walkAst } from "./walkers";
import { updateRenderInfo } from "@unified-latex/unified-latex-util-render-info";

/**
 * Removes any `_renderInfo` and `position` tags present in the AST.
 */
export function trimRenderInfo(ast: Ast.Ast) {
    return walkAst(
        ast,
        (node) => {
            const { _renderInfo, position, ...ret } = node;
            if (_renderInfo != null || position != null) {
                return ret;
            }
            return node;
        },
        ((node) => node != null) as Ast.TypeGuard<Ast.Node>
    );
}

export { updateRenderInfo };
