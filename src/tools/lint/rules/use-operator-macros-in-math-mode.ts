import Trie from "trie-prefix-tree";
import { replaceNode } from "../../../libs/ast";
import * as Ast from "../../../libs/ast-types";
import { match, walkAst } from "../../../libs/ast";
import { Lint, LintPlugin } from "../types";
import { cachedMacroLookup } from "../cache";
import { printRaw } from "../../../libs/print-raw";
import { MatcherContext } from "../../../libs/ast/walkers";

const OPERATOR_NAMES = [
    "Pr",
    "arccos",
    "arcctg",
    "arcsin",
    "arctan",
    "arctg",
    "arg",
    "argmax",
    "argmin",
    "ch",
    "cos",
    "cosec",
    "cosh",
    "cot",
    "cotg",
    "coth",
    "csc",
    "ctg",
    "cth",
    "deg",
    "det",
    "dim",
    "exp",
    "gcd",
    "hom",
    "inf",
    "injlim",
    "ker",
    "lg",
    "lim",
    "liminf",
    "limsup",
    "ln",
    "log",
    "max",
    "min",
    "plim",
    "projlim",
    "sec",
    "sh",
    "sin",
    "sinh",
    "sup",
    "tan",
    "tanh",
    "tg",
    "th",
    "varinjlim",
    "varliminf",
    "varlimsup",
    "varprojlim",
];

// Use a prefix-tree (Trie) to store the operators for quick lookup.
// We put a `$` at the end of each word because the implementation used only
// returns prefixes and we need to know when we've matched an entire word.
// `$` should never be a string in math mode.
const prefixTree = Trie(OPERATOR_NAMES);

/**
 * If the sequence starting at `pos` is a sequence of single character strings
 * matching one of the `OPERATOR_NAMES`, then the matching operator name is returned.
 * Otherwise `null` is returned.
 */
function matchesAtPos(nodes: Ast.Node[], pos: number): string | null {
    // We don't match words that are in the middle of other letters.
    // E.g. the `sin` in "lsinl" is not recognized, but the `sin` in "l sin l" would be.
    const prevNode = nodes[pos - 1];
    if (match.string(prevNode) && prevNode.content.match(/^[a-zA-Z]/)) {
        return null;
    }

    let lastPrefix = "";
    let lastWord = "";
    for (let i = 0; pos + i < nodes.length; i++) {
        const node = nodes[pos + i];
        // In math mode, all string nodes should be single characters. If they're
        // not, we have mangled them via some other process and the shouldn't be treated
        // normally
        if (!(match.string(node) && node.content.length === 1)) {
            break;
        }
        if (prefixTree.isPrefix(lastPrefix + node.content)) {
            lastPrefix += node.content;
        } else {
            break;
        }
        if (prefixTree.hasWord(lastPrefix)) {
            lastWord = lastPrefix;
        }
    }

    // Make sure the next node is not a letter.
    const nextNode = nodes[pos + lastWord.length];
    if (match.string(nextNode) && nextNode.content.match(/^[a-zA-Z]/)) {
        return null;
    }

    return lastWord ? lastWord : null;
}

export const useOperatorMacrosInMathMode: LintPlugin = {
    description: `In math mode, use designated operators like $\\sin$ instead of spelling out $sin$`,
    lint(ast: Ast.Ast): Lint[] {
        const ret: Lint[] = [];

        walkAst(
            ast,
            (nodes) => {
                for (let i = 0; i < nodes.length; i++) {
                    const macro = matchesAtPos(nodes, i);
                    if (macro) {
                        ret.push({
                            description: `Use "\\${macro}" instead of the string "${macro}" to specify an operator name in math mode`,
                        });
                    }
                }
                return nodes;
            },
            ((node: any, context: MatcherContext) =>
                Array.isArray(node) &&
                context?.inMathMode === true) as Ast.TypeGuard<Ast.Node[]>
        );

        // List each lint only once.
        const listedLint = new Set();
        return ret.filter((x) => {
            const dupe = listedLint.has(x.description);
            listedLint.add(x.description);
            return !dupe;
        });
    },
    fixAll(ast: Ast.Ast): Ast.Ast {
        return walkAst(
            ast,
            (nodes) => {
                let outNodes = [...nodes];
                for (let i = 0; i < outNodes.length; i++) {
                    const macro = matchesAtPos(outNodes, i);
                    if (macro) {
                        // Eat the characters that formed the macro and replace it with a fully-formed macro
                        const head = outNodes.slice(0, i);
                        const tail = outNodes.slice(i + macro.length);
                        outNodes = [
                            ...head,
                            { type: "macro", content: macro },
                            ...tail,
                        ];
                    }
                }
                return outNodes;
            },
            ((node: any, context: MatcherContext) =>
                Array.isArray(node) &&
                context?.inMathMode === true) as Ast.TypeGuard<Ast.Node[]>
        );
    },
};
