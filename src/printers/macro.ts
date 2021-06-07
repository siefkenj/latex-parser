import type { Doc } from "prettier";
import { zip } from "../libs/macro-utils";
import * as Ast from "../libs/ast-types";
import * as PrettierTypes from "./prettier-types";
import { getNodeInfo, fill, concat, ESCAPE, indent } from "./common";

export function printMacro(
    path: PrettierTypes.FastPath,
    print: PrettierTypes.RecursivePrintFunc,
    options: any
): Doc {
    const node = path.getNode() as Ast.Macro;
    const { renderInfo, previousNode, nextNode, referenceMap } = getNodeInfo(
        node,
        options
    );

    const content =
        (node.escapeToken != null ? node.escapeToken : ESCAPE) + node.content;
    const args = node.args ? path.map(print, "args") : [];

    // Some of the arguments want to be printed "inline".
    // We loop through the arguments and unwrap the inline ones.
    const rawArgs = [];
    for (const [arg, printedArg] of zip(node.args || [], args)) {
        const renderCache = referenceMap && referenceMap.getRenderCache(arg);
        if (renderInfo.inParMode && renderCache) {
            rawArgs.push(...(renderCache as any[]));
        } else {
            rawArgs.push(printedArg);
        }
    }

    if (referenceMap) {
        referenceMap.setRenderCache(node, { rawArgs, content });
    }

    if (renderInfo.hangingIndent) {
        return indent(fill([content, ...rawArgs]));
    }

    return concat([content, ...rawArgs]);
}
