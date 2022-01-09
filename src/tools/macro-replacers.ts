import { trim, match, replaceNode } from "../libs/ast";
import * as Ast from "../libs/ast-types";
import { trimLeft, trimRight } from "../libs/ast/trim";
import {
    splitOnCondition,
    splitOnMacro,
    unsplitOnMacro,
} from "../libs/macro-utils";
import { printRaw } from "../libs/print-raw";

/**
 *
 */
export type MacroReplacementCallback = (
    content: Ast.Node[],
    originalMacro: Ast.Macro
) => Ast.Macro;
export type MacroReplacementHash = Record<string, MacroReplacementCallback>;
type Replacer = (nodes: Ast.Node[]) => Ast.Node;

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
 * Wraps `content` in the specified wrapper. This command is roughly equivalent to
 * `wrapper(content)` except that leading and trailing whitespace and comments are extracted
 * from `content` and moved to the front or back of the return array. For example,
 * `[" ", "foo", "bar", "% xxx"]` -> `[" ", wrapped(["foo", "bar"]), "% xxx"]`.
 *
 */
function wrapContentsInMacro(
    content: Ast.Node[],
    wrapper: Replacer
): Ast.Node[] {
    let hoistUntil = 0;
    let hoistAfter = content.length;
    for (let i = 0; i < content.length; i++) {
        if (match.whitespace(content[i]) || match.comment(content[i])) {
            hoistUntil = i + 1;
            continue;
        }
        break;
    }
    for (let j = content.length - 1; j >= 0; j--) {
        if (match.whitespace(content[j]) || match.comment(content[j])) {
            hoistAfter = j;
            continue;
        }
        break;
    }

    if (hoistUntil === 0 && hoistAfter === content.length) {
        return [wrapper(content)];
    }

    const frontMatter = content.slice(0, hoistUntil);
    const middle = content.slice(hoistUntil, hoistAfter);
    const backMatter = content.slice(hoistAfter, content.length);

    return frontMatter.concat(wrapper(middle), backMatter);
}

/**
 * Given a sequence of replacer functions `[f, g, h]` return
 * `f \circ g \circ h`
 *
 * @param {((nodes: Ast.Node[]) => Ast.Node)[]} replacers
 * @returns {(nodes: Ast.Node[]) => Ast.Node}
 */
function composeReplacers(replacers: Replacer[]): Replacer {
    if (replacers.length === 0) {
        throw new Error("Cannot compose zero replacement functions");
    }
    return (nodes: Ast.Node[]) => {
        let ret = nodes;
        for (let i = replacers.length - 1; i >= 0; i--) {
            const func = replacers[i];
            ret = [func(ret)];
        }
        return ret[0];
    };
}

/**
 * Given a group or a node array, look for streaming commands (e.g., `\bfseries`) and replace them
 * with the specified macro. The "arguments" of the streaming command are passed to `replacements[macroName](...)`.
 * By default, this command will split at parbreaks (since commands like `\textbf{...} do not accept parbreaks in their
 * contents).
 */
export function replaceStreamingCommand(
    ast: Ast.Group | Ast.Node[],
    replacements: MacroReplacementHash,
    options?: {}
): Ast.Node[] {
    // If we are passed in a group, we may want to "escape" the group.
    // For example, `{\bfseries xx}` becomes `\textbf{xx}`. To accomplish this, we
    // can process the content like normal and then deal with escaping the group.
    let processedContent: Ast.Node[] = [];
    if (match.group(ast)) {
        let content = ast.content;
        // Streaming commands that come at the end of a group don't do anything,
        // so we should remove them
        while (
            content.length > 0 &&
            match.macro(content[content.length - 1]) &&
            replacements[(content[content.length - 1] as Ast.Macro).content]
        ) {
            content.pop();
            content = trim(content);
        }

        // If the group consisted of just streaming commands (for some reason...)
        // it should be eliminated
        if (content.length === 0) {
            return [];
        }

        let innerProcessed = trim(
            replaceStreamingCommand(content, replacements, options)
        );

        let firstMacro = firstSignificantNode(ast.content);
        if (match.macro(firstMacro) && replacements[firstMacro.content]) {
            processedContent = innerProcessed;
        } else {
            processedContent = [{ type: "group", content: innerProcessed }];
        }
    }

    if (Array.isArray(ast)) {
        // Streaming commands that come at the end of a sequence of nodes don't do anything,
        // so we should remove them
        ast = trimRight(ast);
        while (
            ast.length > 0 &&
            match.macro(ast[ast.length - 1]) &&
            replacements[(ast[ast.length - 1] as Ast.Macro).content]
        ) {
            ast.pop();
            ast = trimRight(ast);
        }

        const isSpecialMacro = match.createMacroMatcher(replacements);
        const isPar = (node: Ast.Node) =>
            match.parbreak(node) || match.macro(node, "par");

        const splitByPar = splitOnCondition(ast, isPar);
        // We split on both a parbreak and a literal `\par`. But we will
        // normalize everything to be parbreaks
        splitByPar.separators = splitByPar.separators.map((sep) =>
            match.parbreak(sep) ? sep : { type: "parbreak" }
        );
        const replacers: Replacer[] = [];
        let segments = splitByPar.segments.map((segment) => {
            function applyAccumulatedReplacers(nodes: Ast.Node[]): Ast.Node[] {
                if (replacers.length === 0) {
                    return nodes;
                }
                return wrapContentsInMacro(nodes, composeReplacers(replacers));
            }

            const split = splitOnCondition(segment, isSpecialMacro, {
                onlySplitOnFirstOccurrence: true,
            });

            // If there is only one segment, then then no special macro occurred.
            if (split.segments.length === 1) {
                return applyAccumulatedReplacers(segment);
            }

            // If we did have a special macro occur, recurse!
            const node = split.separators[0] as Ast.Macro;
            const head = split.segments[0];
            let tail = split.segments[1];
            const replacer = (nodes: Ast.Node[]) =>
                replacements[node.content](nodes, node);

            // wrap everything in the tail with the appropriate replacer.
            tail = applyAccumulatedReplacers(
                wrapContentsInMacro(
                    replaceStreamingCommand(tail, replacements, options),
                    replacer
                )
            );

            // If the head ends in whitespace and the tail starts in whitespace, we can trim the excess.
            if (
                !(
                    hasWhitespaceAtEnds(head).end ||
                    match.comment(head[head.length - 1])
                ) &&
                hasWhitespaceAtEnds(tail).start
            ) {
                head.push(tail.shift()!);
            }

            const ret = head.concat(trim(tail));

            // Streaming commands pass through to the next paragraph, so we have to record them before moving on
            for (const node of segment) {
                if (isSpecialMacro(node)) {
                    replacers.push((nodes: Ast.Node[]) =>
                        replacements[node.content](nodes, node)
                    );
                }
            }

            return ret;
        });

        // Leading/trailing whitespace was hoisted in front/back of each replacer.
        // Since we're separated by parbreaks, we can safely trim all that whitespace.
        if (segments.length > 1) {
            segments = segments.map((segment, i) => {
                if (i === 0) {
                    return trimRight(segment);
                }
                if (i === segments.length - 1) {
                    return trimLeft(segment);
                }
                return trim(segment);
            });
        }

        processedContent = unsplitOnMacro({
            segments: segments,
            macros: splitByPar.separators,
        });
    }

    return processedContent;
}

/**
 * Returns whether the array has whitespace at the start/end. Comments with `leadingWhitespace === true`
 * are counted as whitespace. Other comments are ignored.
 */
export function hasWhitespaceAtEnds(nodes: Ast.Node[]): {
    start: boolean;
    end: boolean;
} {
    let start = false;
    let end = false;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (match.comment(node)) {
            // A comment with leading whitespace will render with leading whitespace,
            // so if we encounter one, we should consider ourselves to have leading whitespace.
            if (node.leadingWhitespace) {
                start = true;
                break;
            }
            continue;
        }
        if (match.whitespace(node)) {
            start = true;
        }
        break;
    }
    for (let j = nodes.length - 1; j >= 0; j--) {
        const node = nodes[j];
        if (match.comment(node)) {
            if (node.leadingWhitespace) {
                end = true;
                break;
            }
            continue;
        }
        if (match.whitespace(node)) {
            end = true;
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
