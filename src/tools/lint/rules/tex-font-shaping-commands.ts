import { replaceNode } from "../../../libs/ast";
import * as Ast from "../../../libs/ast-types";
import { match } from "../../../libs/ast";
import { Lint, LintPlugin } from "../types";
import { cachedMacroLookup } from "../cache";
import { printRaw } from "../../../libs/print-raw";

const REPLACEMENTS: Record<string, Ast.Macro> = {
    bf: { type: "macro", content: "bfseries" },
    it: { type: "macro", content: "itshape" },
    rm: { type: "macro", content: "rmfamily" },
    sc: { type: "macro", content: "scshape" },
    sf: { type: "macro", content: "sffamily" },
    sl: { type: "macro", content: "slshape" },
    tt: { type: "macro", content: "ttfamily" },
};

const isReplaceable = match.createMacroMatcher(REPLACEMENTS);

export const texFontShapingCommandsLint: LintPlugin = {
    description: `Avoid using TeX font changing commands like \\bf, \\it, etc. Prefer LaTeX \\bfseries, \\itshape, etc.. See CTAN l2tabuen Section 2.`,
    lint(ast: Ast.Ast): Lint[] {
        const ret: Lint[] = [];
        for (const [macro, replacement] of Object.entries(REPLACEMENTS)) {
            const matching = cachedMacroLookup(ast, macro);
            if (matching.length > 0) {
                ret.push({
                    description: `Replace "\\${macro}" with "${printRaw(
                        replacement
                    )}"`,
                });
            }
        }

        return ret;
    },
    fixAll(ast: Ast.Ast): Ast.Ast {
        return replaceNode(
            ast,
            (node) => {
                if (!match.anyMacro(node)) {
                    return node;
                }

                return REPLACEMENTS[node.content] || node;
            },
            isReplaceable
        );
    },
};
