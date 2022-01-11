import * as Ast from "../../libs/ast-types";
import { argContentsFromMacro } from "../../libs/ast/arguments";
import { systemeContentsToArray } from "../../libs/systeme/systeme";

export const katexSpecificMacroReplacements: Record<
    string,
    (node: Ast.Macro) => Ast.Node
> = {
    systeme: (node) => {
        try {
            const args = argContentsFromMacro(node);
            const whitelistedVariables = (args[1] || undefined) as
                | (Ast.String | Ast.Macro)[]
                | undefined;
            const equations = args[3] || [];
            return systemeContentsToArray(equations, {
                properSpacing: false,
                whitelistedVariables,
            });
        } catch (e) {
            return node;
        }
    },
};
