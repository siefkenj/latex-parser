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

    const content: PrettierTypes.Doc[] = ["%" + printRaw(node.content)];
    return concat(content)
}
