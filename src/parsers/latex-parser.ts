import * as prettierPluginLatex from "../prettier-plugin-latex";
import { parse, printRaw } from "./parser";
import {
    parseAlignEnvironment,
    createMatchers,
} from "./align-environment-parser";
import * as macroUtils from "../libs/macro-utils";

const astParsers = {
    parseAlignEnvironment,
    utils: { ...macroUtils, createMatchers },
};

export { parse, printRaw, prettierPluginLatex, astParsers };
