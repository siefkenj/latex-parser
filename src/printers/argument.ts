import type { Doc } from "prettier";
import * as Ast from "../libs/ast-types";
import * as PrettierTypes from "./prettier-types";
import {
    getNodeInfo,
    concat,
    formatDocArray,
    hardline,
    join,
    ifBreak,
    breakParent,
    line,
    group,
    indent,
    softline,
} from "./common";
import { match, trim } from "../libs/ast";
import { parsePgfkeys } from "../parsers/pgfkeys-parser";
import { printRaw, linebreak } from "../libs/print-raw";

export function printArgument(
    path: PrettierTypes.FastPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.Argument;
    const { renderInfo, previousNode, nextNode, referenceMap } = getNodeInfo(
        node,
        options
    );

    const openMark = node.openMark;
    const closeMark = node.closeMark;
    let content = path.map(print, "content");
    content = formatDocArray(node.content, content, options);

    // if the last item is a comment, we need to insert a hardline
    if (match.comment(node.content[node.content.length - 1])) {
        content.push(hardline);
    }

    const rawRet = [openMark, ...content, closeMark];
    if (referenceMap) {
        // Save the raw rendered data in case a renderer higher up
        // wants to unwrap it
        referenceMap.setRenderCache(node, rawRet);
    }

    if (path.getParentNode()) {
        const parentNode = path.getParentNode();
        const { renderInfo: parentRenderInfo } = getNodeInfo(
            parentNode,
            options
        );
        if (parentRenderInfo.pgfkeysArgs) {
            const leadingComment =
                node.content.length > 0 &&
                match.comment(node.content[0]) &&
                node.content[0].sameline
                    ? node.content[0]
                    : null;
            const content = leadingComment
                ? node.content.slice(1)
                : node.content;
            return printPgfkeysArgument(trim(content), {
                openMark: node.openMark,
                closeMark: node.closeMark,
                leadingComment,
            });
        }
    }

    return concat(rawRet);
}

/**
 * Format a sequence of Pgfkeys key-value pairs. `nodes` will be parsed
 * by a grammar defining Pgfkeys
 *
 * @param {Ast.Node[]} nodes
 * @param {{ openMark: string; closeMark: string; leadingComment: Ast.Comment | null }} braces - A `leadingComment` is a comment that appears as the first item in the environment (e.g. `\pgfkeys{%comment\na,b,c}`)
 * @returns {Doc}
 */
function printPgfkeysArgument(
    nodes: Ast.Node[],
    braces: {
        openMark: string;
        closeMark: string;
        leadingComment: Ast.Comment | null | undefined;
    }
): Doc {
    const parsed = parsePgfkeys(nodes);

    const content: Doc[] = [];
    for (const part of parsed) {
        const isLastItem = part === parsed[parsed.length - 1];

        if (part.itemParts) {
            // parts are printed using `printRaw`, `hardline` is used in place
            // of "\n"
            const parts = part.itemParts.map((node) =>
                concat(
                    printRaw(node, { asArray: true }).map((token) =>
                        token === linebreak ? hardline : token
                    )
                )
            );
            const row = join("=", parts);
            content.push(row);
            if (part.trailingComma) {
                content.push(",");
            }
        }
        if (part.trailingComment) {
            const leadingContent: Doc[] = part.itemParts
                ? [" "]
                : [];
            if (part.leadingParbreak) {
                // We preserve parbreaks before comments, so if we have
                // one, insert an extra hardline
                leadingContent.push(hardline);
            }

            content.push(
                ...leadingContent,
                // We're carefully and manually controlling the newlines,
                // so print the comment directly without any newlines
                "%",
                part.trailingComment.content,
                breakParent
            );
        }

        if (!isLastItem) {
            content.push(line);
        }
    }

    let leadingComment: Doc[] = [""];
    if (braces.leadingComment) {
        if (braces.leadingComment.leadingWhitespace) {
            leadingComment.push(" ");
        }
        leadingComment.push("%" + braces.leadingComment.content, breakParent);
    }

    return group(
        concat([
            braces.openMark,
            ...leadingComment,
            // If there is no content, we don't want to push an extra `softline`.
            // This matters because the braces group could still be broken by `leadingComment`
            content.length > 0 ? indent(concat([softline, ...content])) : "",
            softline,
            braces.closeMark,
        ])
    );
}
