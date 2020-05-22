import PegParser from "../PEG-grammar/align-environment.pegjs";
import { match, decorateArrayForPegjs } from "./macro-utils";

export function createMatchers(rowSepMacros, colSep) {
    return {
        isRowSep: (node) => rowSepMacros.some((sep) => match.macro(node, sep)),
        isColSep: (node) => colSep.some((sep) => match.string(node, sep)),
        isWhitespace: (node) => match.whitespace(node),
        isSameLineComment: (node) => match.comment(node) && node.sameline,
        isOwnLineComment: (node) => match.comment(node) && !node.sameline,
    };
}

/**
 * Parse the content of an align environment into an array of row objects.
 * Each row object looks like
 * ```
 *  {
 *    cells: [...],
 *    colSeps: [...],
 *    rowSep: ...,
 *    trailingComment: ...
 *  }
 * ```
 * `...` may be an ast node or `null`.
 *
 * @export
 * @param {[object]} ast
 * @param {string} [colSep=["&"]]
 * @param {string} [rowSepMacros=["\\", "hline", "cr"]]
 * @returns
 */
export function parseAlignEnvironment(
    ast,
    colSep = ["&"],
    rowSepMacros = ["\\", "hline", "cr"]
) {
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return PegParser.parse(ast, createMatchers(rowSepMacros, colSep));
}
