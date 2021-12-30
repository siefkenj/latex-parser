import { replaceNode } from "../../libs/ast";
import * as Ast from "../../libs/ast-types";
import { macroReplacements } from "./macro-subs";
import { match } from "../../libs/ast";
import { expandUnicodeLigatures } from "..";

export function convertToHtml(ast: Ast.Ast): Ast.Ast {
    let newAst = replaceNode(
        ast,
        (node) => {
            if (!match.macro(node)) {
                return node;
            }
            return macroReplacements[node.content](node);
        },
        (node) => match.macro(node) && !!macroReplacements[node.content]
    );
    
    // This should be done near the end since some macros like `\&` should
    // be expanded via html rules first (and not turned into their corresponding
    // ligature directly)
    newAst = expandUnicodeLigatures(newAst);

    return newAst;
}
