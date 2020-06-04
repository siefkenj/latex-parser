import * as Ast from "../libs/ast-types";
import * as PrettierTypes from "./prettier-types";
import { getNodeInfo, concat, formatDocArray, hardline } from "./common";
import { match } from "../libs/ast";

export function printArgument(
    path: PrettierTypes.FastPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): PrettierTypes.Doc {
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

    return concat(rawRet);
}
