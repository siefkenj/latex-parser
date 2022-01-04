import { XColorParser as PegParser } from "../../parsers/pegjs-parsers";
import * as XColorSpec from "./xcolor-types";

/**
 * Print an `xparse` argument specification AST
 * to a string.
 *
 * @param {*} node
 * @returns {string}
 */
export function printRaw(node: XColorSpec.Ast, root = false): string {
    if (typeof node === "string") {
        return node;
    }

    if (Array.isArray(node)) {
        const sepToken = root ? " " : "";
        return node.map((tok) => printRaw(tok)).join(sepToken);
    }

    if (node.type === "invalid_spec") {
        return node.content;
    }

    switch (node.type) {
        case "postfix":
            if (node.plusses != null) {
                return `!!${node.plusses}`;
            } else {
                return `!![${node.num}]`;
            }
        case "complete_mix":
            return `!${node.mix_percent}!${node.name}`;
        case "partial_mix":
            return `!${node.mix_percent}`;
        case "expr":
            return `${node.prefix || ""}${node.name}${node.mix_expr
                .map((mix) => printRaw(mix))
                .join("")}${node.postfix ? printRaw(node.postfix) : ""}`;
        case "weighted_expr":
            return `${printRaw(node.color)},${node.weight}`;
        case "extended_expr":
            let prefix = node.core_model;
            if (node.div) {
                prefix += `,${node.div}`;
            }
            return `${prefix}:${node.expressions
                .map((expr) => printRaw(expr))
                .join(";")}`;
        case "function":
            return `>${node.name},${node.args.map((a) => "" + a).join(",")}`;
        case "color":
            return (
                printRaw(node.color) +
                node.functions.map((f) => printRaw(f)).join("")
            );

        default:
            console.warn(
                `Unknown node type "${(node as any).type}" for node`,
                node
            );
            return "";
    }
}

const parseCache: Record<string, XColorSpec.Ast> = {};

/**
 * Parse an `xparse` argument specification string to an AST.
 * This function caches results. Don't mutate the returned AST!
 *
 * @param {string} [str=""] - LaTeX string input
 * @returns - AST for LaTeX string
 */
export function parse(str = ""): XColorSpec.Ast {
    parseCache[str] = parseCache[str] || PegParser.parse(str);
    return parseCache[str];
}
