import * as Hast from "hast";
import { h } from "hastscript";
import { Plugin, unified } from "unified";
import * as Ast from "../../unified-latex-types";
import { TypeGuard } from "../../unified-latex-types";
import { expandUnicodeLigatures } from "../../unified-latex-util-ligatures/libs/expand-unicode-ligatures";
import { match } from "../../unified-latex-util-match";
import { visit } from "../../unified-latex-util-visit";
import { toHastWithLoggerFactory } from "./html-subs/to-hast";
import { unifiedLatexToHtmlLike } from "./unified-latex-plugin-to-html-like";

type PluginOptions = void;

/**
 * Unified plugin to convert a `unified-latex` AST into a `hast` AST.
 */
export const unifiedLatexToHast: Plugin<PluginOptions[], Ast.Root, Hast.Root> =
    function unifiedLatexAttachMacroArguments(options) {
        return (tree, file) => {
            unified().use(unifiedLatexToHtmlLike).run(tree);

            // This should happen right before converting to HTML because macros like `\&` should
            // be expanded via html rules first (and not turned into their corresponding ligature directly)
            expandUnicodeLigatures(tree);

            // If there is a \begin{document}...\end{document}, that's the only
            // content we want to convert.
            let content = tree.content;
            visit(
                tree,
                (env) => {
                    content = env.content;
                },
                {
                    test: ((node) =>
                        match.environment(
                            node,
                            "document"
                        )) as TypeGuard<Ast.Environment>,
                }
            );

            const toHast = toHastWithLoggerFactory(file.message.bind(file));
            let converted = toHast(tree);
            if (!Array.isArray(converted)) {
                converted = [converted];
            }
            // Wrap everything in a Hast.Root node
            const ret = h();
            ret.children = converted;
            return ret;
        };
    };
