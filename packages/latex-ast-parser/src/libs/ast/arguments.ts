import * as Ast from "../ast-types";
import { gobbleArguments } from "@unified-latex/unified-latex-util-arguments";
import {
    attachMacroArgsInArray as unifiedAttachMacroArgsInArray,
    attachMacroArgs as unifiedAttachMacroArgs,
} from "@unified-latex/unified-latex-util-arguments";
import { MacroInfoRecord } from "../ast-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";

/**
 * Recursively search for and attach the arguments for a
 * particular macro to its AST node. `macroInfo` should
 * contain a `signature` property which specifies the arguments
 * signature in xparse syntax.
 *
 * @param {object} ast
 * @param {string} macroName
 * @param {object} macroInfo
 * @returns - a new AST
 */
export function attachMacroArgs<T extends Ast.Ast>(
    ast: T,
    macros: { [macroName: string]: { signature?: string; renderInfo?: object } }
): T {
    const tree = JSON.parse(JSON.stringify(ast));
    unifiedAttachMacroArgs(tree, macros);
    return tree;
}

/**
 * Search (in a right-associative way) through the array for instances of
 * `macroName` and attach arguments to the macro. Argument signatures are
 * specified by `macroInfo.signature`.
 *
 * Info stored in `macroInfo.renderInfo` will be attached to the node
 * with attribute `_renderInfo`.
 */
export function attachMacroArgsInArray(
    ast: Ast.Node[],
    macros: MacroInfoRecord
): Ast.Node[] {
    const nodes = [...ast];
    unifiedAttachMacroArgsInArray(nodes, macros);
    return nodes;
}

/**
 * Search from the start of an array and pick off any arguments matching the passed-in
 * argspec string.
 *
 * @param {[object]} ast
 * @param {string} macroName
 * @param {object} macroInfo
 * @returns {[object]}
 */
export function getArgsInArray(
    ast: Ast.Node[],
    signature: string
): {
    arguments: Ast.Argument[];
    rest: Ast.Node[];
} {
    ast = [...ast];
    const { args } = gobbleArguments(ast, signature);
    return { arguments: args, rest: ast };
}

/**
 * Extract the contents of a macro's arguments. If an argument was omitted (e.g.,
 * because it was an optional arg that wasn't included), then `null` is returned.
 */
export function argContentsFromMacro(
    macro: Ast.Macro | Ast.Environment
): (Ast.Node[] | null)[] {
    return getArgsContent(macro);
}
