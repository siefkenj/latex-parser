import { tagLikeMacro } from "..";
import * as Ast from "../../libs/ast-types";
import { argContentsFromMacro } from "../../libs/ast/arguments";
import { printRaw } from "../../libs/print-raw";
import {
    PREDEFINED_XCOLOR_COLORS,
    xcolorColorToHex,
} from "../../libs/xcolor/xcolor";
import { textColorMacro } from "../lint/rules/argument-color-commands";
import {
    deleteComments,
    MacroReplacementHash,
    singleArgMacroFactory,
} from "../macro-replacers";
import { xcolorMacroToHex } from "../xcolor";

/**
 * Returns a function that wrap the first arg of a macro
 * in a <span></span> tag with the specified attributes.
 */
function wrapInSpanFactory(
    attributes: Record<string, string>,
    tagName = "span"
) {
    return (node: Ast.Macro) =>
        tagLikeMacro({
            tag: tagName,
            content: node.args ? node.args[0].content : [],
            attributes: { ...attributes },
        });
}

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
 * Returns a function that wraps the third argument of a macro in the specified
 * tag. The third argument is chosen because `\section*[foo]{Section}` commands
 * take three arguments.
 */
function createHeading(tag: string) {
    return (node: Ast.Macro) => {
        if (!node.args) {
            return tagLikeMacro({ tag });
        }
        const args = argContentsFromMacro(node);
        const starred = !!args[0];
        const attributes: Record<string, string> = starred
            ? { class: "starred" }
            : {};
        return tagLikeMacro({
            tag,
            content: args[2] || [],
            attributes,
        });
    };
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
