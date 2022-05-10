import * as Hast from "hast";
import { h } from "hastscript";
import {
    extractFromHtmlLike,
    isHtmlLikeTag,
} from "../../../unified-latex-html-like";
import * as Ast from "../../../unified-latex-types";
import { printRaw } from "../../../unified-latex-util-print-raw";

type HastNode = Hast.Element | Hast.Text | Hast.Comment;

/**
 * Create a `toHast` function that will log by making a call to `logger`.
 */
export function toHastWithLoggerFactory(
    logger: (message: string, node: any) => void
) {
    /**
     * Convert Ast.Node to Hast nodes.
     */
    return function toHast(node: Ast.Node): HastNode | HastNode[] {
        // Because `isHtmlLikeTag` is a type guard, if we use it directly on
        // `node` here, then in the switch statement `node.type === "macro"` will be `never`.
        // We rename the variable to avoid this issue.
        const htmlNode = node;
        if (isHtmlLikeTag(htmlNode)) {
            const extracted = extractFromHtmlLike(htmlNode);
            const attributes: Record<string, any> = extracted.attributes;
            return h(
                extracted.tag,
                attributes,
                extracted.content.flatMap(toHast)
            );
        }

        switch (node.type) {
            case "string":
                return {
                    type: "text",
                    value: node.content,
                    position: node.position,
                };
            case "comment":
                return {
                    type: "comment",
                    value: node.content,
                    position: node.position,
                };
            case "inlinemath":
                return h(
                    "span",
                    { className: "inline-math" },
                    printRaw(node.content)
                );
            case "mathenv":
            case "displaymath":
                return h(
                    "div",
                    { className: "display-math" },
                    printRaw(node.content)
                );
            case "verb":
            case "verbatim":
                return h("pre", { className: node.env }, node.content);
            case "whitespace":
                return { type: "text", value: " ", position: node.position };
            case "parbreak":
                return h("br");
            case "group":
                // Groups are just ignored.
                return node.content.flatMap(toHast);
            case "environment":
                logger(
                    `Unknown environment when converting to HTML "${printRaw(
                        node.env
                    )}"`,
                    node
                );
                return h(
                    "div",
                    { className: ["environment", printRaw(node.env)] },
                    node.content.flatMap(toHast)
                );
            case "macro":
                logger(
                    `Unknown environment when converting to HTML "${JSON.stringify(
                        node
                    )}"`,
                    node
                );
                return h(
                    "span",
                    { className: ["macro", `macro-${node.content}`] },
                    printRaw(node.args || "")
                );
            case "root":
                return node.content.flatMap(toHast);
            default:
                throw new Error(
                    `Unknown node type; cannot convert to HAST ${JSON.stringify(
                        node
                    )}`
                );
        }
    };
}

/**
 * Convert Ast.Node to Hast nodes.
 */
export const toHast = toHastWithLoggerFactory(console.warn);
