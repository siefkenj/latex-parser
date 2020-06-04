import Prettier from "prettier/standalone";
import { parse, printRaw } from "../parsers/parser";
import { ReferenceMap, trim } from "../libs/macro-utils";
import * as Ast from "../libs/ast-types";
import * as PrettierTypes from "./prettier-types";

import {
    softline,
    concat,
    hardline,
    line,
    ESCAPE,
    getNodeInfo,
} from "./common";
import { printMacro } from "./macro";
import { printArgument } from "./argument";
import { printRoot } from "./root";
import { printComment } from "./comment";
import { printInlineMath, printDisplayMath } from "./math";
import {
    printVerbatimEnvironment,
    printEnvironment,
    printAlignedEnvironment,
} from "./environment";

export function printLatexAst(
    path: PrettierTypes.FastPath,
    options: PrettierTypes.Options & { referenceMap?: ReferenceMap },
    print: PrettierTypes.RecursivePrintFunc
) {
    const node = path.getValue();
    const { renderInfo } = getNodeInfo(node, options);

    if (node == null) {
        return node;
    }
    if (typeof node === "string") {
        return node;
    }

    // tmp variables
    let content, startToken, bodyStartToken, env;
    switch (node.type) {
        case "root":
            // Create the ReferenceMap from the root node, so that
            // it can traverse the entire AST
            if (options.referenceMap) {
                console.warn(
                    "Processing root node, but ReferenceMap already exists. Are there multiple nodes of type 'root'?"
                );
            }
            options.referenceMap = new ReferenceMap(node);
            return printRoot(path, print, options);
        case "argument":
            return printArgument(path, print, options);
        case "comment":
            return printComment(path, print, options);
        case "environment":
        case "mathenv":
            if (renderInfo.alignContent) {
                return printAlignedEnvironment(path, print, options);
            }
            return printEnvironment(path, print, options);
        case "displaymath":
            return printDisplayMath(path, print, options);
        case "group":
            return concat(["{", printRaw(node.content), "}"]);
        case "inlinemath":
            return printInlineMath(path, print, options);
        case "macro":
            return printMacro(path, print, options);
        case "parbreak":
            return concat([hardline, hardline]);
        case "string":
            return node.content;
        case "verb":
            return concat([
                ESCAPE,
                node.env,
                node.escape,
                printRaw(node.content),
                node.escape,
            ]);
        case "verbatim":
            return printVerbatimEnvironment(path, print, options);
        case "whitespace":
            return line;
        default:
            console.warn("Printing unknown type", node);
            return printRaw(node);
    }
}
