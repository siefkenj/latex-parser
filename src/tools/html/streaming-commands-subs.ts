import * as Ast from "../../libs/ast-types";
import { textColorMacro } from "../lint/rules/argument-color-commands";
import {
    MacroReplacementHash,
    singleArgMacroFactory,
} from "../macro-replacers";

/**
 * Factory function that returns a wrapper which wraps the passed in `content`
 * as an arg to a macro named `macroName`.
 */
function boundFirstArgMacroFactory(
    macroName: string,
    firstArg: string
): (content: Ast.Node[]) => Ast.Macro {
    return (content: Ast.Node[]) => ({
        type: "macro",
        content: macroName,
        args: [
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: firstArg }],
            },
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content,
            },
        ],
        _renderInfo: { inParMode: true },
    });
}

/**
 * Rules for replacing a macro with an html-like macro
 * that will render has html when printed.
 */
export const streamingMacroReplacements: MacroReplacementHash = {
    color: textColorMacro,
    bfseries: singleArgMacroFactory("textbf"),
    itshape: singleArgMacroFactory("textit"),
    rmfamily: singleArgMacroFactory("textrm"),
    scshape: singleArgMacroFactory("textsc"),
    sffamily: singleArgMacroFactory("textsf"),
    slshape: singleArgMacroFactory("textsl"),
    ttfamily: singleArgMacroFactory("texttt"),
    Huge: boundFirstArgMacroFactory("textsize", "Huge"),
    huge: boundFirstArgMacroFactory("textsize", "huge"),
    LARGE: boundFirstArgMacroFactory("textsize", "LARGE"),
    Large: boundFirstArgMacroFactory("textsize", "Large"),
    large: boundFirstArgMacroFactory("textsize", "large"),
    normalsize: boundFirstArgMacroFactory("textsize", "normalsize"),
    small: boundFirstArgMacroFactory("textsize", "small"),
    footnotesize: boundFirstArgMacroFactory("textsize", "footnotesize"),
    scriptsize: boundFirstArgMacroFactory("textsize", "scriptsize"),
    tiny: boundFirstArgMacroFactory("textsize", "tiny"),
};
