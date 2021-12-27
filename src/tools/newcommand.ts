import { allMacros } from ".";
import { match, walkAst } from "../libs/ast";
import * as Ast from "../libs/ast-types";
import { splitOnMacro, unsplitOnMacro } from "../libs/macro-utils";
import { printRaw } from "../libs/print-raw";
import { parseMacroSubstitutions } from "../parsers/macro-substitutions-parser";
import { parse } from "../parsers/parser";

const LATEX_NEWCOMMAND = new Set([
    "newcommand",
    "renewcommand",
    "providecommand",
]);
const XPARSE_NEWCOMMAND = new Set([
    "NewDocumentCommand",
    "RenewDocumentCommand",
    "ProvideDocumentCommand",
    "DeclareDocumentCommand",
    "NewExpandableDocumentCommand",
    "RenewExpandableDocumentCommand",
    "ProvideExpandableDocumentCommand",
    "DeclareExpandableDocumentCommand",
]);

export function newcommandMacroToSpec(node: Ast.Macro): string {
    if (LATEX_NEWCOMMAND.has(node.content)) {
        // The signature is `s m o o m`. The signature of the defined macro
        // is completely dependent on the optional args. E.g. the macro defined by
        // \newcommand*{\foo}[4][x]{\bar}
        // has 5 arguments with the first one optional
        if (!node.args) {
            console.warn(
                String.raw`Found a '\newcommand' macro that doesn't have any args`,
                node
            );
            return "";
        }
        if (match.blankArgument(node.args[2])) {
            return "";
        }
        let numArgsForSig = +printRaw(node.args[2].content);
        let sigOptionalArg: string[] = [];
        // `node.args[3]` determines the default value of the initial optional argument.
        // If it is present, we need to change the signature.
        if (!match.blankArgument(node.args[3])) {
            numArgsForSig--;
            sigOptionalArg = ["o"];
        }
        return [
            ...sigOptionalArg,
            ...Array.from({ length: numArgsForSig }).map((_) => "m"),
        ].join(" ");
    }
    if (XPARSE_NEWCOMMAND.has(node.content)) {
        if (!node.args?.length) {
            console.warn(
                String.raw`Found a '\NewDocumentCommand' macro that doesn't have any args`,
                node
            );
            return "";
        }
        const macroSpec = printRaw(node.args[1]?.content);
        return macroSpec.trim();
    }

    return "";
}
export function newcommandMacroToName(node: Ast.Macro): string {
    if (LATEX_NEWCOMMAND.has(node.content)) {
        // These commands all have a similar structure. E.g.:
        // \newcommand{\foo}[4][x]{\bar}
        if (!node.args?.length) {
            return "";
        }
        const definedName = node.args[1]?.content[0];
        if (!definedName) {
            console.warn("Could not find macro name defined in", node);
            return "";
        }
        if (match.macro(definedName) || match.string(definedName)) {
            return definedName.content;
        }
    }
    if (XPARSE_NEWCOMMAND.has(node.content)) {
        if (!node.args?.length) {
            return "";
        }
        const definedName = node.args[0]?.content[0];
        if (!definedName) {
            console.warn("Could not find macro name defined in", node);
            return "";
        }
        if (match.macro(definedName) || match.string(definedName)) {
            return definedName.content;
        }
    }

    return "";
}

/**
 * Returns the AST that should be used for substitution. E.g.,
 * `\newcommand{\foo}{\bar{#1}}` would return `\bar{#1}`.
 */
export function newcommandMacroToSubstitutionAst(node: Ast.Macro): Ast.Node[] {
    if (LATEX_NEWCOMMAND.has(node.content)) {
        // These commands all have a similar structure. E.g.:
        // \newcommand{\foo}[4][x]{\bar}
        if (!node.args?.length) {
            return [];
        }
        const substitution = node.args[node.args.length - 1];
        if (!substitution) {
            console.warn("Could not find macro name defined in", node);
            return [];
        }
        return substitution.content;
    }
    if (XPARSE_NEWCOMMAND.has(node.content)) {
        if (!node.args?.length) {
            return [];
        }
        return node.args[2]?.content || [];
    }

    return [];
}

/**
 * A factory function. Given a macro definition, creates a function that accepts
 * the macro's arguments and outputs an Ast with the contents substituted (i.e.,
 * it expands the macro).
 */
export function createMacroExpander(substitution: Ast.Ast) {
    let hasSubstitutions = false;
    // Prepare a new tree with substitution stubs in it.
    const cachedSubstitutionTree = walkAst(
        substitution,
        (array) => {
            const ret = parseMacroSubstitutions(array);
            // Keep track of whether there are any substitutions so we can bail early if not.
            hasSubstitutions =
                hasSubstitutions ||
                ret.some((node) => node.type === "hash_number");
            return ret;
        },
        Array.isArray
    );

    return (macro: Ast.Macro) => {
        if (!hasSubstitutions) {
            return cachedSubstitutionTree;
        }
        const cachedSubstitutions = (macro.args || []).map(
            (arg) => arg.content
        );
        function getSubstitutionForHashNumber(hashNumber: {
            type: "hash_number";
            number: number;
        }) {
            return (
                cachedSubstitutions[hashNumber.number - 1] || {
                    type: "string",
                    content: `#${hashNumber.number}`,
                }
            );
        }
        return walkAst(
            cachedSubstitutionTree,
            (array) =>
                array.flatMap((node) =>
                    node.type === "hash_number"
                        ? getSubstitutionForHashNumber(node)
                        : node
                ),
            Array.isArray
        );
    };
}
