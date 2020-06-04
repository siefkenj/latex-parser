import * as Ast from "../libs/ast-types";
import * as PrettierTypes from "./prettier-types";
import {
    getNodeInfo,
    softline,
    fill,
    concat,
    hardline,
    line,
    ESCAPE,
} from "./common";
import { printRaw } from "../parsers/parser";

export function printComment(
    path: PrettierTypes.FastPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): PrettierTypes.Doc {
    const node = path.getNode() as Ast.Comment;
    const { renderInfo, previousNode, nextNode, referenceMap } = getNodeInfo(
        node,
        options
    );

    // If a comment is on the same line as other content and it has leading whitespace,
    // add a single whitespace token.
    let leadingWhitespace = "";
    if (node.leadingWhitespace && node.sameline) {
        leadingWhitespace = " ";
    }

    const content: PrettierTypes.Doc[] = [
        leadingWhitespace,
        "%" + printRaw(node.content),
    ];
    return concat(content);
}
