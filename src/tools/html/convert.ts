import { replaceNode } from "../../libs/ast";
import * as Ast from "../../libs/ast-types";
import { macroReplacements } from "./macro-subs";
import { match } from "../../libs/ast";
import { allEnvironments, expandUnicodeLigatures, walkAst } from "..";
import { wrapPars } from "./paragraph-split";
import { MatcherContext } from "../../libs/ast/walkers";
import { printRaw } from "../../libs/print-raw";
import { environmentReplacements } from "./environment-subs";

export interface ConvertToHtmlOptions {
    wrapPars?: boolean;
}

export function convertToHtml(
    ast: Ast.Ast,
    options: ConvertToHtmlOptions = { wrapPars: false }
): Ast.Ast {
    let newAst = ast;

    // Remove all comments
    newAst = replaceNode(
        newAst,
        (node) => {
            if (!match.comment(node)) {
                return node;
            }

            if (node.leadingWhitespace) {
                return { type: "whitespace" };
            }

            return null;
        },
        match.comment
    );

    const environments = allEnvironments(newAst);

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

    // Replace special macros, e.g. \section{} and friends, with their HTML equivalents
    newAst = replaceNode(
        newAst,
        (node) => {
            if (!match.macro(node)) {
                return node;
            }
            return macroReplacements[node.content](node);
        },
        (node) => match.macro(node) && !!macroReplacements[node.content]
    );

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

    // This should be done near the end since some macros like `\&` should
    // be expanded via html rules first (and not turned into their corresponding
    // ligature directly)
    newAst = expandUnicodeLigatures(newAst);

    return newAst;
}
