import { tagLikeMacro } from "..";
import * as Ast from "../../libs/ast-types";

/**
 * Returns a function that wrap the first arg of a macro
 * in a <span></span> tag with the specified attributes.
 */
function wrapInSpanFactory(attributes: Record<string, string>) {
    return (node: Ast.Macro) =>
        tagLikeMacro({
            tag: "span",
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
        const starred = node.args[0].content.length > 0;
        const attributes: Record<string, string> = starred
            ? { class: "starred" }
            : {};
        return tagLikeMacro({
            tag,
            content: node.args ? node.args[2].content : [],
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
    textit: wrapInSpanFactory({ class: "textit" }),
    textbf: wrapInSpanFactory({ class: "textbf" }),
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
};
