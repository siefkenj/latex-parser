import type { Doc } from "prettier";
import { zip, hasPreambleCode } from "../../libs/macro-utils";
import * as Ast from "../../libs/ast-types";
import * as PrettierTypes from "./prettier-types";
import { getNodeInfo, fill, concat, formatDocArray } from "./common";

export function printRoot(
    path: PrettierTypes.FastPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.Root;
    const { renderInfo, previousNode, nextNode, referenceMap } = getNodeInfo(
        node,
        options
    );

    const content = path.map(print, "content");
    const rawContent = formatDocArray(node.content, content, options);

    const concatFunction = hasPreambleCode(node.content) ? concat : fill;
    return concatFunction(rawContent);
}
