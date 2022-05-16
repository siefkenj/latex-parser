import { unified } from "unified";
import * as Ast from "../../unified-latex-types";
import { unifiedLatexFromString } from "./plugin-from-string";

/**
 * Parse the string into an AST.
 */
export function parse(str: string): Ast.Root {
    return unified().use(unifiedLatexFromString).parse(str);
}
