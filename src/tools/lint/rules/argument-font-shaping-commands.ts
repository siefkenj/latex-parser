import { replaceNode, trim } from "../../../libs/ast";
import * as Ast from "../../../libs/ast-types";
import { match } from "../../../libs/ast";
import { Lint, LintPlugin } from "../types";
import { cachedMacroLookup } from "../cache";
import { printRaw } from "../../../libs/print-raw";
import { tools } from "../../../parsers/latex-parser";
import {
    firstSignificantNode,
    hasParbreak,
    hasWhitespaceAtEnds,
    singleArgMacroFactory,
} from "../../macro-replacers";
import { replaceStreamingCommand } from "../..";

const REPLACEMENTS: Record<string, (content: Ast.Node[]) => Ast.Macro> = {
    bfseries: singleArgMacroFactory("textbf"),
    itshape: singleArgMacroFactory("textit"),
    rmfamily: singleArgMacroFactory("textrm"),
    scshape: singleArgMacroFactory("textsc"),
    sffamily: singleArgMacroFactory("textsf"),
    slshape: singleArgMacroFactory("textsl"),
    ttfamily: singleArgMacroFactory("texttt"),
};

const isReplaceable = match.createMacroMatcher(Object.keys(REPLACEMENTS));

/**
 * Returns true if the `group` is a group that starts with one of the `REPLACEMENT` macros.
 */
function groupStartsWithMacroAndHasNoParbreak(
    group: Ast.Node
): group is Ast.Group {
    if (!match.group(group)) {
        return false;
    }
    // Find the first non-whitespace non-comment node
    let firstNode: Ast.Node | null = firstSignificantNode(group.content);
    return isReplaceable(firstNode) && !hasParbreak(group.content);
}

/**
 * In an array, search for occurrences of `REPLACEMENTS` macros
 * and replace them with their counterparts, which take as args everything from the macro
 * position to the end of the group.
 */
function gobbleArgs(nodes: Ast.Node[]): Ast.Node[] {
    let currPos = nodes.length - 1;
    let remainingContent: Ast.Node[] = [...nodes];

    while (currPos >= 0) {
        const node = remainingContent[currPos];
        if (isReplaceable(node)) {
            let content = remainingContent.slice(currPos + 1);
            remainingContent = remainingContent.slice(0, currPos);
            // We now do whitespace checks. If there is whitespace at the start
            // of `content` and whitespace at the end of `remainingContent` we can
            // trim off the whitespace in `content`. If not, we need to take care to
            // insert the needed whitespace
            const contentWhitespaceLoc = hasWhitespaceAtEnds(content);
            const remainingWhitespaceLoc =
                hasWhitespaceAtEnds(remainingContent);
            if (contentWhitespaceLoc.start || contentWhitespaceLoc.end) {
                content = trim(content);
            }
            if (contentWhitespaceLoc.start && !remainingWhitespaceLoc.end) {
                remainingContent.push({ type: "whitespace" });
                currPos++;
            }
            if (content.length > 0) {
                remainingContent.push(REPLACEMENTS[node.content](content));
                if (contentWhitespaceLoc.end) {
                    remainingContent.push({ type: "whitespace" });
                }
            }
        }
        currPos -= 1;
    }

    return remainingContent;
}

export const argumentFontShapingCommandsLint: LintPlugin = {
    description: `Prefer using text shaping commands with arguments (e.g. \\textbf{foo bar}) over in-stream text shaping commands (e.g. {\\bfseries foo bar}) if the style does not apply for multiple paragraphs.`,
    lint(ast: Ast.Ast): Lint[] {
        const ret: Lint[] = [];
        for (const [macro, replacement] of Object.entries(REPLACEMENTS)) {
            const matching = cachedMacroLookup(ast, macro);
            if (matching.length > 0) {
                ret.push({
                    description: `Replace "\\${macro}" with "${printRaw(
                        replacement([{ type: "string", content: "..." }])
                    )}"`,
                });
            }
        }

        return ret;
    },
    fixAll(ast: Ast.Ast): Ast.Ast {
        // We should first look for the to-be-escaped commands at the start of groups,
        // since the replacement command will "consume" the group.

        let newAst = replaceNode(
            ast,
            (node) => {
                if (!match.group(node)) {
                    return node;
                }

                return replaceStreamingCommand(node, REPLACEMENTS);
            },
            groupStartsWithMacroAndHasNoParbreak
        );
        return tools.walkAst(
            newAst,
            (node) => {
                if (!Array.isArray(node)) {
                    return node;
                }
                return gobbleArgs(node);
            },
            ((node) =>
                Array.isArray(node) && !hasParbreak(node)) as Ast.TypeGuard<
                Ast.Node[]
            >
        );
    },
};
