import { trim, match, replaceNode } from "../libs/ast";
import * as Ast from "../libs/ast-types";
import { printRaw } from "../libs/print-raw";

/**
 * Factory function that returns a wrapper which wraps the passed in `content`
 * as an arg to a macro named `macroName`.
 */
export function singleArgMacroFactory(
    macroName: string
): (content: Ast.Node[]) => Ast.Macro {
    return (content: Ast.Node[]) => ({
        type: "macro",
        content: macroName,
        args: [
            {
                type: "argument",
                openMark: "{",
                closeMark: "}",
                content,
            },
        ],
        _renderInfo: { inParMode: true },
    });
}

/**
 * Replace a group with a macro whose arguments are the group contents.
 * This function looks for the first non-whitespace/non-comment macro in the group.
 * It assumes that this macro should be replaced by a macro in `replacements`.
 *
 * For example, to  turn `{\tt foo}` into `\texttt{foo}`, one would use
 * `replacements={tt: {type: "macro", contents: singleArgMacroFactory("texttt")}}`.
 *
 * **Note**: you must ensure that the first non-whitespace/non-comment item is the desired macro *before*
 * calling this function.
 *
 * If there are any comments, there are any initial comments, they are moved before the macro.
 * Whitespace is trimmed.
 */
export function groupToMacro(
    group: Ast.Group,
    replacements: Record<
        string,
        (content: Ast.Node[], originalMacro: Ast.Macro) => Ast.Macro
    >
): Ast.Node[] {
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
    const replacementFunc = replacements[macro.content];
    if (!replacementFunc) {
        throw new Error(
            `Cannot replace ${printRaw(
                macro
            )}. Is not a macro in the replacement table.`
        );
    }

    if (content.length === 0) {
        return frontMatter;
    }

    return [...frontMatter, replacementFunc(content, macro)];
}

/**
 * Returns whether the array has whitespace at the start/end. Comments are ignored.
 */
export function hasWhitespaceAtEnds(nodes: Ast.Node[]): {
    start: boolean;
    end: boolean;
} {
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
 * Returns the first non-whitespace/non-comment node in `nodes`. If there is no such
 * node, `null` is returned.
 */
export function firstSignificantNode(nodes: Ast.Node[]): Ast.Node | null {
    let firstNode: Ast.Node | null = null;
    for (const node of nodes) {
        if (match.whitespace(node) || match.comment(node)) {
            continue;
        }
        firstNode = node;
        break;
    }

    return firstNode;
}

/**
 * Returns whether there is a parbreak in `nodes` (either a parsed parbreak,
 * or the macro `\par`)
 */
export function hasParbreak(nodes: Ast.Node[]) {
    return nodes.some(
        (node) => match.parbreak(node) || match.macro(node, "par")
    );
}

/**
 * Returns a new AST with all comments removed. Care is taken to preserve whitespace.
 * For example 
 * ```
 * x%
 * y
 * ```
 * becomes `xy` but
 * ```
 * x %
 * y
 * ```
 * becomes `x y`
 */
export function deleteComments(ast: Ast.Ast): Ast.Ast {
    return replaceNode(
        ast,
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
}
