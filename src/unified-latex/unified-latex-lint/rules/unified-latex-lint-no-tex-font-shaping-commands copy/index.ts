import { lintRule } from "unified-lint-rule";
import { m } from "../../../unified-latex-builder";
import { printRaw } from "../../../unified-latex-util-print";
import * as Ast from "../../../unified-latex-types";
import { match } from "../../../unified-latex-util-match";
import { visit } from "../../../unified-latex-util-visit";
import { replaceNodeDuringVisit } from "../../utils/replace-node";

const REPLACEMENTS: Record<string, string> = {
    bf: "bfseries",
    it: "itshape",
    rm: "rmfamily",
    sc: "scshape",
    sf: "sffamily",
    sl: "slshape",
    tt: "ttfamily",
};

const isReplaceable = match.createMacroMatcher(REPLACEMENTS);

type PluginOptions =
    | {
          /**
           * Whether or not to fix the lint
           *
           * @type {boolean}
           */
          fix?: boolean;
      }
    | undefined;

export const DESCRIPTION = `## Lint Rule

Avoid using TeX font changing commands like \\bf, \\it, etc. Prefer LaTeX \\bfseries, \\itshape, etc.. 

This rule flags any usage of \`${Object.keys(REPLACEMENTS)
    .map((r) => printRaw(m(r)))
    .join("` `")}\`

### See

CTAN l2tabuen Section 2.`;

export const unifiedLatexLintNoTexFontShapingCommands = lintRule<
    Ast.Root,
    PluginOptions
>({ origin: "no-tex-font-shaping-commands" }, (tree, file, options) => {
    visit(
        tree,
        (node, info) => {
            const macroName = node.content;
            file.message(
                `Replace "${printRaw(node)}" with "${printRaw(
                    m(REPLACEMENTS[macroName])
                )}"`,
                node
            );

            if (options?.fix) {
                replaceNodeDuringVisit(m(REPLACEMENTS[macroName]), info);
            }
        },
        { test: isReplaceable }
    );
});
