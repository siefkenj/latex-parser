import type { Doc } from "prettier";
import * as Ast from "../libs/ast-types";
import * as PrettierTypes from "./prettier-types";
import { printRaw } from "../parsers/parser";

export function printComment(
    path: PrettierTypes.FastPath,
    _print: PrettierTypes.RecursivePrintFunc,
    _options: any
): Doc {
    const node = path.getNode() as Ast.Comment;

    // If a comment is on the same line as other content and it has leading whitespace,
    // add a single whitespace token.
    let leadingWhitespace = "";
    if (node.leadingWhitespace && node.sameline) {
        leadingWhitespace = " ";
    }

    const content: Doc[] = [leadingWhitespace, "%" + printRaw(node.content)];
    return content;
}
