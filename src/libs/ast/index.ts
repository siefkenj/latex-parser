import { match } from "./matchers";
import { trim } from "./trim";
import { replaceNode, walkAst } from "./walkers";
import { trimRenderInfo, updateRenderInfo } from "./render-info";
import { processEnvironment } from "./environments";
import {
    attachMacroArgs,
    attachMacroArgsInArray,
    gobbleSingleArgument,
} from "./arguments";
import { EnvInfo, MacroInfo } from "./types";
import * as Ast from "../ast-types";

export { EnvInfo, MacroInfo };

export {
    match,
    trim,
    walkAst,
    trimRenderInfo,
    processEnvironment,
    replaceNode,
    attachMacroArgs,
    attachMacroArgsInArray,
    updateRenderInfo,
    gobbleSingleArgument,
};

/**
 * Make a deep copy of the given node.
 */
export function cloneNode<T extends Ast.Ast>(node: T): T {
    return JSON.parse(JSON.stringify(node));
}
