import * as prettierPluginLatex from "../prettier-plugin-latex";
import { parse, parseMath, printRaw } from "./parser";
import {
    parseAlignEnvironment,
    createMatchers,
} from "./align-environment-parser";
import * as macroUtils from "../libs/macro-utils";
import * as tools from "../tools";

const astParsers = {
    parseAlignEnvironment,
    utils: { ...macroUtils, createMatchers },
};

export { parse, parseMath, printRaw, prettierPluginLatex, astParsers, tools };
