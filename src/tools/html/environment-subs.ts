import cssesc from "cssesc";
import { match } from "../../libs/ast";
import { tagLikeMacro } from "..";
import * as Ast from "../../libs/ast-types";
import { printRaw } from "../../libs/print-raw";
import { wrapPars } from "./paragraph-split";
import { parseAlignEnvironment } from "../../parsers/align-environment-parser";
import { argContentsFromMacro } from "../../libs/ast/arguments";
import {
    parseTabularSpec,
    TabularColumn,
} from "../../unified-latex/unified-latex-ctan/package/tabularx";

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
        content: env.content,
    });
}

function createTableFromTabular(env: Ast.Environment) {
    const tabularBody = parseAlignEnvironment(env.content);
    const args = argContentsFromMacro(env);
    let columnSpecs: TabularColumn[] = [];
    try {
        columnSpecs = parseTabularSpec(args[1] || []);
    } catch (e) {}

    const tableBody = tabularBody.map((row) => {
        const content = row.cells.map((cell, i) => {
            const columnSpec = columnSpecs[i];
            const styles = [];
            if (columnSpec) {
                const { alignment } = columnSpec;
                if (alignment.alignment === "center") {
                    styles.push("text-align: center;");
                }
                if (alignment.alignment === "right") {
                    styles.push("text-align: right;");
                }
                if (
                    columnSpec.pre_dividers.some(
                        (div) => div.type === "vert_divider"
                    )
                ) {
                    styles.push("border-left: 1px solid;");
                }
                if (
                    columnSpec.post_dividers.some(
                        (div) => div.type === "vert_divider"
                    )
                ) {
                    styles.push("border-right: 1px solid;");
                }
            }
            return tagLikeMacro(
                styles.length > 0
                    ? {
                          tag: "td",
                          content: cell,
                          attributes: { style: styles.join(" ") },
                      }
                    : {
                          tag: "td",
                          content: cell,
                      }
            );
        });
        return tagLikeMacro({ tag: "tr", content });
    });

    return tagLikeMacro({
        tag: "table",
        content: [
            tagLikeMacro({
                tag: "tbody",
                content: tableBody,
            }),
        ],
        attributes: { class: "tabular" },
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
    tabular: createTableFromTabular,
};
