import { replaceNode, trim } from "../../../libs/ast";
import * as Ast from "../../../libs/ast-types";
import { match } from "../../../libs/ast";
import { Lint, LintPlugin } from "../types";
import { cachedMacroLookup } from "../cache";
import { printRaw } from "../../../libs/print-raw";
import { tools } from "../../../parsers/latex-parser";

const REPLACEMENTS: Record<string, Ast.Macro> = {
    bfseries: {
        type: "macro",
        content: "textbf",
        args: [
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: "..." }],
            },
        ],
    },
    itshape: {
        type: "macro",
        content: "textit",
        args: [
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: "..." }],
            },
        ],
    },
    rmfamily: {
        type: "macro",
        content: "textrm",
        args: [
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: "..." }],
            },
        ],
    },
    scshape: {
        type: "macro",
        content: "textsc",
        args: [
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: "..." }],
            },
        ],
    },
    sffamily: {
        type: "macro",
        content: "textsf",
        args: [
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: "..." }],
            },
        ],
    },
    slshape: {
        type: "macro",
        content: "textsl",
        args: [
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: "..." }],
            },
        ],
    },
    ttfamily: {
        type: "macro",
        content: "texttt",
        args: [
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content: [{ type: "string", content: "..." }],
            },
        ],
    },
};

const isReplaceable = match.createMacroMatcher(REPLACEMENTS);

/**
 * Returns true if the `group` is a group that starts with one of the `REPLACEMENT` macros.
 */
function groupStartsWithMacro(group: Ast.Node): group is Ast.Group {
    if (!match.group(group)) {
        return false;
    }
    // Find the first non-whitespace non-comment node
    let firstNode: Ast.Node | null = null;
    for (const node of group.content) {
        if (match.whitespace(node) || match.comment(node)) {
            continue;
        }
        firstNode = node;
        break;
    }
    return isReplaceable(firstNode);
}

/**
 * Create a macro based on `baseMacro` but with a single mandatory argument
 * consisting of `content`.
 */
function createMacroWithArgs(
    baseMacro: Ast.Macro,
    content: Ast.Node[]
): Ast.Macro {
    return {
        type: "macro",
        content: baseMacro.content,
        args: [
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content,
            },
        ],
        _renderInfo: { inParMode: true },
    };
}

/**
 * Convert a group into the argument of a macro. This command assumes
 * that the first non-whitespace, non-comment item in `group` is a valid
 * macro in `REPLACEMENTS`.
 */
function groupToMacro(group: Ast.Group): Ast.Node[] {
    let groupContent = trim(group.content);
    // Find where the macro is. It might not be in the first position if there
    // are leading comments
    let i = 0;
    while (
        match.whitespace(groupContent[i]) ||
        match.comment(groupContent[i])
    ) {
        i += 1;
    }
    const macro = groupContent[i];
    const frontMatter = trim(groupContent.slice(0, i));
    const content = trim(groupContent.slice(i + 1));

    if (!match.macro(macro)) {
        throw new Error(
            `Cannot replace ${printRaw(
                macro
            )}. Is not a macro in the replacement table.`
        );
    }
    const replacementMacro = REPLACEMENTS[macro.content];
    if (!replacementMacro) {
        throw new Error(
            `Cannot replace ${printRaw(
                macro
            )}. Is not a macro in the replacement table.`
        );
    }

    if (content.length === 0) {
        return frontMatter;
    }

    return [...frontMatter, createMacroWithArgs(replacementMacro, content)];
}

function whitespaceAt(nodes: Ast.Node[]): { start: boolean; end: boolean } {
    let start = false;
    let end = false;
    for (let i = 0; i < nodes.length; i++) {
        if (match.whitespace(nodes[i])) {
            start = true;
            continue;
        }
        if (match.comment(nodes[i])) {
            continue;
        }
        break;
    }
    for (let j = nodes.length - 1; j >= 0; j--) {
        if (match.whitespace(nodes[j])) {
            end = true;
            continue;
        }
        if (match.comment(nodes[j])) {
            continue;
        }
        break;
    }
    return { start, end };
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
            const contentWhitespaceLoc = whitespaceAt(content);
            const remainingWhitespaceLoc = whitespaceAt(remainingContent);
            if (contentWhitespaceLoc.start || contentWhitespaceLoc.end) {
                content = trim(content);
            }
            if (contentWhitespaceLoc.start && !remainingWhitespaceLoc.end) {
                remainingContent.push({ type: "whitespace" });
                currPos++;
            }
            if (content.length > 0) {
                remainingContent.push(
                    createMacroWithArgs(REPLACEMENTS[node.content], content)
                );
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
    description: `Prefer using text shaping commands with arguments (e.g. \\textbf{foo bar}) over in-stream text shaping commands (e.g. {\\bfseries foo bar})`,
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
        // We should first look for the to-be-escaped commands at the start of groups,
        // since the replacement command will "consume" the group.

        let newAst = replaceNode(
            ast,
            (node) => {
                if (!match.group(node)) {
                    return node;
                }

                return groupToMacro(node);
            },
            groupStartsWithMacro
        );
        return tools.walkAst(
            newAst,
            (node) => {
                if (!Array.isArray(node)) {
                    return node;
                }
                return gobbleArgs(node);
            },
            Array.isArray
        );
    },
};
