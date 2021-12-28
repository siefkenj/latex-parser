import * as Ast from "../ast-types";
import { listMathChildren } from "./render-info";

export type MatcherContext = { inMathMode: boolean };

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
export function walkAst<T extends any>(
    ast: Ast.Ast,
    callback: (ast: T, context?: MatcherContext) => T,
    matcher: (node: any, context?: MatcherContext) => node is T = ((
        node: Ast.Ast
    ) => false) as any,
    options: { triggerTime?: "early" | "late"; context?: MatcherContext } = {
        triggerTime: "early",
        context: { inMathMode: false },
    }
): Ast.Ast {
    const context = options.context || { inMathMode: false };
    function reapply(node: Ast.Ast) {
        return walkAst(node, callback, matcher, {
            ...options,
            context: { ...context },
        });
    }

    if (ast == null) {
        // Early or late, we callback right before getting a null value
        if (matcher(ast, { ...context })) {
            return callback(ast, { ...context }) as Ast.Ast;
        }
        return ast;
    }

    if (options.triggerTime === "early") {
        if (matcher(ast, { ...context })) {
            (ast as any) = callback(ast, { ...context });
        }
    }

    if (Array.isArray(ast)) {
        ast = ast.map(reapply) as Ast.Node[];
        // run `callback` after recursion for "late" trigger
        if (options.triggerTime === "late") {
            if (matcher(ast, { ...context })) {
                (ast as any) = callback(ast, { ...context });
            }
        }
        return ast;
    }

    // We don't want to recursively apply to the `content`
    // of all types (e.g., comments and macros), so specify
    // a blacklist.
    let childProps = ["content", "args"];
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
        if (prop in ret) {
            if (childMathModes.enter.includes(prop)) {
                context.inMathMode = true;
            } else if (childMathModes.leave.includes(prop)) {
                context.inMathMode = false;
            }
            (ret as any)[prop] = reapply((ret as any)[prop]);
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
    replacer: (node: Ast.Node) => Ast.Node | Ast.Node[] | null,
    matcher: (node: Ast.Node) => boolean
): Ast.Ast {
    return walkAst(
        ast,
        (array: Ast.Node[]) =>
            array.flatMap((node) => {
                if (matcher(node)) {
                    return replacer(node) || [];
                } else {
                    return node;
                }
            }),
        Array.isArray
    );
}
