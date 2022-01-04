import cssesc from "cssesc";
import { match, trim } from "../../libs/ast";
import { tagLikeMacro } from "..";
import * as Ast from "../../libs/ast-types";
import { printRaw } from "../../libs/print-raw";
import { wrapPars } from "./paragraph-split";

function enumerateFactory(parentTag = "ol", className = "enumerate") {
    return function enumerateToHtml(env: Ast.Environment) {
        // The body of an enumerate has already been processed and all relevant parts have
        // been attached to \item macros as arguments.
        const items = env.content.filter((node) => match.macro(node, "item"));
        const content = items.flatMap((node) => {
            if (!match.macro(node) || !node.args) {
                return [];
            }

            const attributes: Record<string, string> = {};
            // Figure out if there any manually-specified item labels. If there are,
            // we need to specify a custom list-style-type.
            // We test the open mark to see if an optional argument was actually supplied
            // (rather than testing if the arg's contents have length) because
            // typing `\item[]` is a common way to make a list item without a marker/bullet
            if (node.args[0].openMark === "[") {
                const formattedLabel = cssesc(printRaw(node.args[0].content));
                // Note the space at the end is important.
                const styleString = formattedLabel
                    ? `list-style-type: '${formattedLabel} ';`
                    : "list-style-type: none;";
                attributes.style = styleString;
            }

            const body = node.args[1].content;
            return tagLikeMacro({
                tag: "li",
                content: wrapPars(body),
                attributes,
            });
        });

        return tagLikeMacro({
            tag: parentTag,
            attributes: { class: className },
            content,
        });
    };
}

function createCenteredElement(env: Ast.Environment) {
    return tagLikeMacro({
        tag: "center",
        attributes: { class: "center" },
        content: wrapPars(env.content),
    });
}

/**
 * Rules for replacing a macro with an html-like macro
 * that will render has html when printed.
 */
export const environmentReplacements: Record<
    string,
    (node: Ast.Environment) => Ast.Macro | Ast.String | Ast.Environment
> = {
    enumerate: enumerateFactory("ol"),
    itemize: enumerateFactory("ul", "itemize"),
    center: createCenteredElement,
};
