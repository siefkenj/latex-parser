import { VisitorContext } from "@unified-latex/unified-latex-util-visit";
import { match } from "@unified-latex/unified-latex-util-match";
import * as Ast from "@unified-latex/unified-latex-types";
import { hasProp } from "../type-guards";

interface WalkAstOptions {
    triggerTime?: "early" | "late";
    context?: VisitorContext;
}

const MATCHER_CONTEXT_DEFAULTS: Readonly<VisitorContext> = {
    inMathMode: false,
    hasMathModeAncestor: false,
};

function listMathChildren(node: Ast.Ast): {
    enter: string[];
    leave: string[];
} {
    const NULL_RETURN = { enter: [], leave: [] };
    if (Array.isArray(node)) {
        return NULL_RETURN;
    }
    if (match.math(node)) {
        // When we enter a math environment, our content is always
        // considered math mode
        return { enter: ["content"], leave: [] };
    }

    const renderInfo: { inMathMode?: boolean } = node._renderInfo || {};
    if (renderInfo.inMathMode == null) {
        return NULL_RETURN;
    }
    if (match.macro(node)) {
        if (renderInfo.inMathMode === true) {
            return { enter: ["args"], leave: [] };
        } else if (renderInfo.inMathMode === false) {
            return { enter: [], leave: ["args"] };
        }
    }
    if (match.environment(node)) {
        if (renderInfo.inMathMode === true) {
            return { enter: ["content"], leave: [] };
        } else {
            return { enter: [], leave: ["content"] };
        }
    }
    return NULL_RETURN;
}

/**
 * Walk the AST and replace a node with `callback(node)` whenever
 * `callbackTrigger(node)` returns true.
 *
 * @param {object} ast
 * @param {function} callback
 * @param {function} [matcher=() => false]
 * @param {{triggerTime: string}} - "early" indicates that `callback` is called before `walkAst` recurses down the tree. "late" calls `callback` after it has recursed.
 * @returns {object}
 */
export function walkAst<T extends Ast.Ast>(
    ast: Ast.Ast,
    callback: (
        ast: T,
        context?: VisitorContext
    ) => T extends Ast.Node ? Ast.Node : T,
    matcher: (node: any, context?: VisitorContext) => node is T = ((
        node: Ast.Ast
    ) => false) as any,
    options?: WalkAstOptions
): Ast.Ast {
    options = Object.assign(
        {
            triggerTime: "early",
            context: MATCHER_CONTEXT_DEFAULTS,
        },
        options || {}
    );
    const context = options.context || MATCHER_CONTEXT_DEFAULTS;
    function reapply(node: Ast.Ast) {
        return walkAst(node, callback, matcher, {
            ...options,
            context: { ...context },
        });
    }

    if (ast == null) {
        // Early or late, we callback right before getting a null value
        if (matcher(ast, { ...context })) {
            return callback(ast, { ...context });
        }
        return ast;
    }

    if (options.triggerTime === "early") {
        if (matcher(ast, { ...context })) {
            ast = callback(ast, { ...context });
        }
    }

    if (Array.isArray(ast)) {
        ast = ast.map(reapply) as Ast.Node[];
        // run `callback` after recursion for "late" trigger
        if (options.triggerTime === "late") {
            if (matcher(ast, { ...context })) {
                ast = callback(ast, { ...context });
            }
        }
        return ast;
    }

    // We don't want to recursively apply to the `content`
    // of all types (e.g., comments and macros), so specify
    // a blacklist.
    let childProps: ("content" | "args")[] = ["content", "args"];
    switch (ast.type) {
        case "macro":
            childProps = ["args"];
            break;
        case "comment":
        case "string":
        case "verb":
        case "verbatim":
            childProps = [];
            break;
        default:
            break;
    }

    let ret = { ...ast };
    const childMathModes = listMathChildren(ret);
    for (const prop of childProps) {
        if (hasProp(ret, prop)) {
            if (childMathModes.enter.includes(prop)) {
                context.inMathMode = true;
                context.hasMathModeAncestor = true;
            } else if (childMathModes.leave.includes(prop)) {
                context.inMathMode = false;
            }
            ret[prop] = reapply(ret[prop] as Ast.Ast);
        }
    }
    // run `callback` after recursion for "late" trigger
    if (options.triggerTime === "late") {
        if (matcher(ret, { ...context })) {
            (ret as any) = callback(ret, { ...context });
        }
    }

    return ret;
}

/**
 * Walk through the AST and replace each node matched by `matcher` with `replacer`.
 * `replacer` receives as its first argument the node that was matched and may
 * return a node or an array of nodes.
 *
 * `replacer` can remove an element entirely by returning an empty array or null
 */
export function replaceNode(
    ast: Ast.Ast,
    replacer: (
        node: Ast.Node,
        context?: VisitorContext
    ) => Ast.Node | Ast.Node[] | null,
    matcher: (node: Ast.Node, context?: VisitorContext) => boolean,
    options?: WalkAstOptions
): Ast.Ast {
    return walkAst(
        ast,
        (array: Ast.Node[], context) =>
            array.flatMap((node) => {
                if (matcher(node, context)) {
                    return replacer(node, context) || [];
                } else {
                    return node;
                }
            }),
        Array.isArray,
        options
    );
}
