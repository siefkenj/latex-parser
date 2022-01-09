import { TabularParser } from "../../parsers/pegjs-parsers";
import { match, decorateArrayForPegjs } from "../macro-utils";
import * as Ast from "../ast-types";
import { printRaw as latexPrintRaw } from "../print-raw";
import { splitStringsIntoSingleChars } from "../../tools";
import * as TabularSpec from "./tabular-spec-types";

/**
 * Print an `xparse` argument specification AST
 * to a string.
 *
 * @param {*} node
 * @returns {string}
 */
export function printRaw(node: TabularSpec.Ast, root = false): string {
    if (typeof node === "string") {
        return node;
    }

    if (Array.isArray(node)) {
        const sepToken = root ? " " : "";
        return node.map((tok) => printRaw(tok)).join(sepToken);
    }

    switch (node.type) {
        case "vert_divider":
            return "|";
        case "at_divider":
            return `@{${latexPrintRaw(node.content)}}`;
        case "bang_divider":
            return `!{${latexPrintRaw(node.content)}}`;
        case "alignment":
            if (node.alignment === "left") {
                return "l";
            }
            if (node.alignment === "right") {
                return "r";
            }
            if (node.alignment === "center") {
                return "c";
            }
            if (node.alignment === "parbox") {
                if (node.baseline === "top") {
                    return `p{${latexPrintRaw(node.size)}}`;
                }
                if (node.baseline === "default") {
                    return `m{${latexPrintRaw(node.size)}}`;
                }
                if (node.baseline === "bottom") {
                    return `b{${latexPrintRaw(node.size)}}`;
                }
                return `w{${latexPrintRaw(node.baseline)}}{${latexPrintRaw(
                    node.size
                )}}`;
            }
            break;
        case "decl_code":
            return latexPrintRaw(node.code);

        case "column":
            const end_code = node.before_end_code
                ? `<{${printRaw(node.before_end_code)}}`
                : "";
            const start_code = node.before_start_code
                ? `>{${printRaw(node.before_start_code)}}`
                : "";
            return [
                printRaw(node.pre_dividers),
                start_code,
                printRaw(node.alignment),
                end_code,
                printRaw(node.post_dividers),
            ].join("");

        default:
            console.warn(
                `Unknown node type "${(node as any).type}" for node`,
                node
            );
            return "";
    }
    return "";
}

function createMatchers() {
    return {
        matchChar: (node: Ast.Node, char: string) => match.string(node, char),
        isWhitespace: match.whitespace,
        isGroup: match.group,
    };
}

/**
 * Parse for recognized ligatures like `---` and `\:o`, etc. These are
 * replaced with string nodes with the appropriate unicode character subbed in.
 */
export function parseTabularSpec(ast: Ast.Node[]): TabularSpec.TabularColumn[] {
    if (!Array.isArray(ast)) {
        throw new Error("You must pass an array of nodes");
    }
    // All tabular spec commands are single letters, so we pre-split all strings
    // for easy parsing.
    ast = splitStringsIntoSingleChars(ast);
    // We need to at functions to `nodes` so that it imitates
    // a Javascript string. Because we're mutating, make a copy first
    ast = decorateArrayForPegjs([...ast]);
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    return TabularParser.parse(ast, createMatchers());
}
