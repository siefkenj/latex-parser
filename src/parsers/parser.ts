import { attachMacroArgs } from "../libs/ast";
import * as Ast from "../libs/ast-types";

import { printRaw } from "../libs/print-raw";
import {
    EnvInfoRecord,
    MacroInfoRecord,
} from "../unified-latex/unified-latex-types";
import {
    parseMathMinimal,
    processLatexToAstViaUnified,
} from "../unified-latex/unified-latex-util-parse";
import {
    environmentInfo,
    macroInfo,
} from "../unified-latex/unified-latex-ctan";
import { processEnvironments } from "../unified-latex/unified-latex-util-environments";

const LIB_SPECIAL_MACROS: MacroInfoRecord = {};
const LIB_SPECIAL_ENVS: EnvInfoRecord = {};
Object.assign(LIB_SPECIAL_MACROS, ...Object.values(macroInfo));
Object.assign(LIB_SPECIAL_ENVS, ...Object.values(environmentInfo));

/**
 * A special environment is one that is listed in `SPECIAL_ENVIRONMENTS`,
 * which includes additional annotations and processing functions.
 *
 * @param {*} ast
 * @returns
 */
function processSpecialEnvironments<T extends Ast.Ast>(
    ast: T,
    specialEnvironments: EnvInfoRecord
): T {
    ast = JSON.parse(JSON.stringify(ast));
    processEnvironments(ast, specialEnvironments);
    return ast;
}

/**
 * Look for any special macros, grab their arguments, and
 * put them in the `.args` property.
 *
 * @param {*} ast
 * @returns
 */
function attachSpecialMacroArgs<T extends Ast.Ast>(
    ast: T,
    specialMacros: MacroInfoRecord
): T {
    ast = attachMacroArgs(ast, specialMacros);

    return ast;
}

/**
 * Return the known special macros and environments. These macros and environments are combined with
 * those listed in `options`.
 */
function getSpecialMacrosAndEnvironments(options?: {
    macros?: MacroInfoRecord;
    environments?: EnvInfoRecord;
}) {
    const specialMacros: MacroInfoRecord = {
        ...LIB_SPECIAL_MACROS,
    };
    const specialEnvironments: EnvInfoRecord = {
        ...LIB_SPECIAL_ENVS,
    };
    // Combine the special macros/environments with the passed in ones
    if (options) {
        const { macros, environments } = options;
        Object.assign(specialMacros, macros);
        Object.assign(specialEnvironments, environments);
    }

    return { macros: specialMacros, environments: specialEnvironments };
}

/**
 * Attach arguments to macros an environments and process their body as appropriate.
 */
function processMacrosAndEnvironments<T extends Ast.Ast>(
    ast: T,
    options?: { macros?: MacroInfoRecord; environments?: EnvInfoRecord }
): T {
    const { macros: specialMacros, environments: specialEnvironments } =
        getSpecialMacrosAndEnvironments(options);

    ast = attachSpecialMacroArgs(ast, specialMacros);
    ast = processSpecialEnvironments(ast, specialEnvironments);
    return ast;
}

/**
 * Parse the LeTeX string to an AST assuming that the contents
 * should be parsed in math mode. This method always returns an array (not a "root" element).
 *
 * @param {string} [str=""] - LaTeX string input
 * @returns - AST for LaTeX string
 */
export function parseMath(
    input: string | Ast.Ast,
    options?: { macros?: MacroInfoRecord; environments?: EnvInfoRecord }
) {
    const str = typeof input === "string" ? input : printRaw(input);
    const pegAst = parseMathMinimal(str);
    let ast = pegAst;
    ast = processMacrosAndEnvironments(ast, options);
    return ast;
}

/**
 * Parse the LeTeX string to an AST.
 *
 * @param {string} [str=""] - LaTeX string input
 * @returns - AST for LaTeX string
 */
export function parse(
    str = "",
    options?: { macros?: MacroInfoRecord; environments?: EnvInfoRecord }
) {
    const file = processLatexToAstViaUnified().processSync({ value: str });
    return file.result;
}

export { printRaw };
