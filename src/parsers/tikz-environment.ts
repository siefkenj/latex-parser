import {
    TikzEnvironmentMacroParser,
    TikzEnvironmentParser,
} from "./pegjs-parsers";
import { match, decorateArrayForPegjs } from "../libs/macro-utils";
import type * as Ast from "../libs/ast-types";

// The types returned by the grammar

export function createMatchers() {
    return {
        isSemicolon: (node: Ast.Node) => match.string(node, ";"),
        isWhitespace: (node: Ast.Node) => match.whitespace(node),
        isParbreak: (node: Ast.Node) => match.parbreak(node),
        isSameLineComment: (node: Ast.Node) =>
            match.comment(node) && node.sameline,
        isOwnLineComment: (node: Ast.Node) =>
            match.comment(node) && !node.sameline,
        isOpenMark: (node: Ast.Node) => match.string(node, "["),
        isCloseMark: (node: Ast.Node) => match.string(node, "]"),
        isMacro: match.macro,
        isMacroLikeString: (node: Ast.Node) =>
            match.string(node) && node.content.match(/^\w+$/),
    };
}

/**
 * Optional arguments can be applied almost anywhere in a tikz environment.
 * Search through and attach optional arguments where possible.
 *
 * @export
 * @param ast
 * @returns
 */
export function attachTikzOptionalArguments(ast: Ast.Node[]): Ast.Node[] {
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return TikzEnvironmentMacroParser.parse(ast, createMatchers());
}

/**
 * Parse the body of a tikz environment to separate it into
 * commands and comments. Commands are things that end with ";"
 * (and usually start with a macro).
 *
 * @export
 * @param ast
 * @returns
 */
export function parseTikzCommands(ast: Ast.Node[]): Ast.Node[] {
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return TikzEnvironmentParser.parse(ast, createMatchers());
}

export function parseTikzEnvironment(ast: Ast.Node[]): Ast.Node[] {
    return parseTikzCommands(attachTikzOptionalArguments(ast));
}
