import { tagLikeMacro } from "..";
import * as Ast from "../../libs/ast-types";
import { argContentsFromMacro } from "../../libs/ast/arguments";
import { printRaw } from "../../libs/print-raw";
import {
    PREDEFINED_XCOLOR_COLORS,
    xcolorColorToHex,
} from "../../libs/xcolor/xcolor";
import { deleteComments } from "../macro-replacers";

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
export const macroReplacements: Record<
    string,
    (node: Ast.Macro) => Ast.Macro | Ast.String
> = {
    "&": () => ({ type: "string", content: "&amp;" }),
    emph: (node) =>
        tagLikeMacro({
            tag: "em",
            content: node.args ? node.args[0].content : [],
            attributes: { class: "emph" },
        }),
    textrm: wrapInSpanFactory({ class: "textrm" }),
    textsf: wrapInSpanFactory({ class: "textsf" }),
    texttt: wrapInSpanFactory({ class: "texttt" }),
    textsl: wrapInSpanFactory({ class: "textsl" }),
    textit: wrapInSpanFactory({ class: "textit" }, "i"),
    textbf: wrapInSpanFactory({ class: "textbf" }, "b"),
    underline: wrapInSpanFactory({ class: "underline" }),
    part: createHeading("h1"),
    chapter: createHeading("h2"),
    section: createHeading("h3"),
    subsection: createHeading("h4"),
    subsubsection: createHeading("h5"),
    appendix: createHeading("h2"),
    smallskip: (node) =>
        tagLikeMacro({
            tag: "br",
            attributes: { class: "smallskip" },
        }),
    medskip: (node) =>
        tagLikeMacro({
            tag: "br",
            attributes: { class: "medskip" },
        }),
    bigskip: (node) =>
        tagLikeMacro({
            tag: "br",
            attributes: { class: "bigskip" },
        }),
    url: (node) => {
        const args = argContentsFromMacro(node);
        const url = printRaw(args[0] || "#");
        return tagLikeMacro({
            tag: "a",
            attributes: {
                class: "url",
                href: url,
            },
            content: [{ type: "string", content: url }],
        });
    },
    href: (node) => {
        const args = argContentsFromMacro(node);
        const url = printRaw(args[1] || "#");
        return tagLikeMacro({
            tag: "a",
            attributes: {
                class: "href",
                href: url,
            },
            content: args[2] || [],
        });
    },
    "\\": (node) =>
        tagLikeMacro({
            tag: "br",
            attributes: { class: "linebreak" },
        }),
    textcolor: (node) => {
        const args = argContentsFromMacro(node);
        const model = args[0] && printRaw(deleteComments(args[0]));
        const colorStr = printRaw(deleteComments(args[1] || []));
        let color: string | null = null;
        try {
            color = xcolorColorToHex(colorStr, model);
        } catch (e) {}

        if (color) {
            return tagLikeMacro({
                tag: "span",
                attributes: { style: `color: ${color};` },
                content: args[2] || [],
            });
        } else {
            // If we couldn't compute the color, it's probably a named
            // color that wasn't supplied. In this case, we fall back to a css variable
            const cssVarName = "--" + colorStr.replace(/[^a-zA-Z0-9-_]/g, "-");
            return tagLikeMacro({
                tag: "span",
                attributes: { style: `color: var(${cssVarName});` },
                content: args[2] || [],
            });
        }
    },
};
