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
