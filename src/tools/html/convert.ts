import { replaceNode } from "../../libs/ast";
import * as Ast from "../../libs/ast-types";
import { macroReplacements } from "./macro-subs";
import { match } from "../../libs/ast";
import {
    allEnvironments,
    expandUnicodeLigatures,
    replaceStreamingCommand,
    walkAst,
} from "..";
import { wrapPars } from "./paragraph-split";
import { MatcherContext } from "../../libs/ast/walkers";
import { printRaw } from "../../libs/print-raw";
import { environmentReplacements } from "./environment-subs";
import { deleteComments } from "../macro-replacers";
import { streamingMacroReplacements } from "./streaming-commands-subs";
import {
    attachNeededRenderInfo,
    katexSpecificEnvironmentReplacements,
    katexSpecificMacroReplacements,
} from "./katex";

export interface ConvertToHtmlOptions {
    wrapPars?: boolean;
}

/**
 * Convert `ast` into HTML. Math is left in a katex-renderable form. HTML tags are simulated
 * by creating an argument with `openMark: "<tag>"` and `closeMark: "</tag>"` and placing this
 * argument in a macro whose contents and escape symbol are set to the empty string.
 *
 * The resulting AST can be converted to a string via `printRaw`.
 */
export function convertToHtml(
    ast: Ast.Ast,
    options: ConvertToHtmlOptions = { wrapPars: false }
): Ast.Ast {
    let newAst = ast;

    // Remove all comments
    newAst = deleteComments(newAst);
    const environments = allEnvironments(newAst);

    const streamingMacroMatcher = match.createMacroMatcher(
        streamingMacroReplacements
    );
    // All streaming commands need to be converted to their non-streaming forms so that they can
    // be properly escaped.
    newAst = walkAst(
        newAst,
        (nodes) => {
            if (
                (Array.isArray(nodes) &&
                    !nodes.some((node) => streamingMacroMatcher(node))) ||
                (match.group(nodes) &&
                    !nodes.content.some((node) => streamingMacroMatcher(node)))
            ) {
                // If the streaming macros don't appear, don't do anything
                return nodes;
            }
            return replaceStreamingCommand(nodes, streamingMacroReplacements);
        },
        ((node: any, context: MatcherContext) =>
            (match.group(node) || Array.isArray(node)) &&
            context?.inMathMode !== true) as Ast.TypeGuard<
            Ast.Group | Ast.Node[]
        >,
        { triggerTime: "late" }
    );

    // Wrap paragraphs. This needs to be done before `\section{}` etc. commands
    // (i.e.,9 commands that would break a paragraph) are subbed out.
    // We only wrap top-level pars because it's too hard to guess where pars should be elsewhere.
    if (options.wrapPars) {
        if (environments.has("document")) {
            newAst = walkAst(
                newAst,
                (env) => {
                    //console.log(printRaw(wrapPars(nodes)));
                    return { ...env, content: wrapPars(env.content) };
                },
                ((node) =>
                    match.environment(
                        node,
                        "document"
                    )) as Ast.TypeGuard<Ast.Environment>
                //((node: any, context: MatcherContext) =>
                //    Array.isArray(node) &&
                //    context?.inMathMode === false) as Ast.TypeGuard<Ast.Node[]>
            );
        } else if (!Array.isArray(newAst) && newAst.type === "root") {
            newAst = { ...newAst, content: wrapPars(newAst.content) };
        }
    }

    // Replace special environments
    newAst = walkAst(
        newAst,
        (env) => {
            const envName = printRaw(env.env);
            if (environmentReplacements[envName]) {
                return environmentReplacements[envName](env);
            }
            return env;
        },
        match.anyEnvironment
    );

    // Replace special macros, e.g. \section{} and friends, with their HTML equivalents
    newAst = replaceNode(
        newAst,
        (node) => {
            if (!match.macro(node)) {
                return node;
            }
            return macroReplacements[node.content](node);
        },
        (node, context) =>
            match.macro(node) &&
            !!macroReplacements[node.content] &&
            context?.inMathMode !== true
    );

    // Do KaTeX-specific replacements
    const macroMatcher = match.createMacroMatcher(
        katexSpecificMacroReplacements
    );
    const environmentMatcher = match.createEnvironmentMatcher(
        katexSpecificEnvironmentReplacements
    );
    newAst = attachNeededRenderInfo(newAst);
    newAst = replaceNode(
        newAst,
        (node) => {
            if (!match.macro(node)) {
                return node;
            }
            return katexSpecificMacroReplacements[node.content](node);
        },
        macroMatcher
    );
    newAst = replaceNode(
        newAst,
        (node) => {
            if (!match.environment(node)) {
                return node;
            }
            const envName = printRaw(node.env);
            return katexSpecificEnvironmentReplacements[envName](node);
        },
        environmentMatcher,
        { triggerTime: "late" }
    );

    // This should be done near the end since some macros like `\&` should
    // be expanded via html rules first (and not turned into their corresponding
    // ligature directly)
    newAst = expandUnicodeLigatures(newAst);

    return newAst;
}
