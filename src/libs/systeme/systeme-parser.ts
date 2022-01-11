import { SystemeParser as PegParser } from "../../parsers/pegjs-parsers";
import { match } from "../ast";
import * as Ast from "../ast-types";
import { decorateArrayForPegjs } from "../macro-utils";
import { printRaw as latexPrintRaw } from "../print-raw";
import * as SystemeSpec from "./systeme-types";

/**
 * Print an `systeme` argument specification AST
 * to a string.
 *
 * @param {*} node
 * @returns {string}
 */
export function printRaw(node: SystemeSpec.Ast, root = false): string {
    if (typeof node === "string") {
        return node;
    }

    if (Array.isArray(node)) {
        const sepToken = root ? " " : "";
        return node.map((tok) => printRaw(tok)).join(sepToken);
    }

    switch (node.type) {
        case "annotation":
            return `${latexPrintRaw(node.marker)}${latexPrintRaw(
                node.content
            )}`;
        case "item":
            return `${node.op ? latexPrintRaw(node.op) : ""}${latexPrintRaw(
                node.content
            )}`;
        case "equation":
            const left = node.left.map((n) => printRaw(n)).join("");
            const right = latexPrintRaw(node.right);
            const equals = node.equals ? latexPrintRaw(node.equals) : "";
            return `${left}${equals}${right}`;
        case "line":
            const equation = node.equation ? printRaw(node.equation) : "";
            const annotation = node.annotation ? printRaw(node.annotation) : "";
            const sep = node.sep ? latexPrintRaw(node.sep) : "";

            const body = `${equation}${annotation}${sep}`;
            if (node.trailingComment) {
                return latexPrintRaw([body, node.trailingComment]);
            }

            return body;

        default:
            console.warn(
                `Unknown node type "${(node as any).type}" for node`,
                node
            );
            return "";
    }
}

type SystemeMatchers = {
    at?: string;
    equals?: string;
    equationSeparator?: string;
    mathOperations?: string[];
    whitelistedVariables?: (string | Ast.String | Ast.Macro)[];
};

function createMatchers({
    at = "@",
    equals = "=",
    equationSeparator = ",",
    mathOperations = ["+", "-"],
    whitelistedVariables,
}: SystemeMatchers = {}) {
    let isVar: (node: Ast.Node) => boolean = (node: Ast.Node) =>
        match.anyString(node) && !!node.content.match(/[a-zA-Z]/);
    if (whitelistedVariables) {
        // Unwrap all strings
        whitelistedVariables = whitelistedVariables.map((v) =>
            match.anyString(v) ? v.content : v
        );
        const macros = whitelistedVariables.filter((v) =>
            match.anyMacro(v)
        ) as Ast.Macro[];
        const strings = whitelistedVariables.filter(
            (v) => typeof v === "string"
        ) as string[];
        const macroHash = Object.fromEntries(macros.map((v) => [v.content, v]));
        const stringHash = Object.fromEntries(strings.map((s) => [s, s]));
        const macroMatcher = match.createMacroMatcher(macroHash);
        isVar = (node: Ast.Node) =>
            macroMatcher(node) ||
            (match.anyString(node) && !!stringHash[node.content]);
    }
    return {
        isSep: (node: Ast.Node) => match.string(node, equationSeparator),
        isVar,
        isOperation: (node: Ast.Node) =>
            mathOperations.some((op) => match.string(node, op)),
        isEquals: (node: Ast.Node) => match.string(node, equals),
        isAt: (node: Ast.Node) => match.string(node, at),
        isSubscript: (node: Ast.Node) =>
            match.macro(node, "_") && node.escapeToken === "",
        isWhitespace: match.whitespace,
        isSameLineComment: (node: Ast.Node) =>
            match.comment(node) && node.sameline,
        isOwnLineComment: (node: Ast.Node) =>
            match.comment(node) && !node.sameline,
    };
}

/**
 * Parse the contents of the `\systeme{...}` macro
 */
export function parse(
    ast: Ast.Node[],
    options?: SystemeMatchers
): SystemeSpec.Line[] {
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return PegParser.parse(ast, createMatchers(options || {}));
}
