import * as ArgSpec from "./argspec-types";
import * as Ast from "./ast-types";
import { printRaw } from "./print-raw";
import { parse as parseArgspec } from "./argspec-parser";

export type EnvInfo = {
    renderInfo?: {
        /**
         * Whether the body of the environment should be treated as math mode
         *
         * @type {boolean}
         */
        inMathMode?: boolean;
        /**
         * Whether to align the environment contents based on `&` and `\\` delimiters
         * (like a matrix or tabular environment).
         *
         * @type {boolean}
         */
        alignContent?: boolean;
        /**
         * Whether the arguments should be treated as pgfkeys-type arguments.
         *
         * @type {boolean}
         */
        pgfkeysArgs?: boolean;
    };
    /**
     * Function to process the body of an environment. The return value of `processContent`
     * is treated as the new body.
     *
     */
    processContent?: (ast: Ast.Node[]) => Ast.Node[];
    /**
     * The environment signature as an xparse argument specification string.
     *
     * @type {string}
     */
    signature?: string;
};

export type MacroInfo = {
    renderInfo?: {
        /**
         * Whether the macro's contents wraps along with the current
         * paragraph or displays as it's own block.
         *
         * @type {boolean}
         */
        inParMode?: boolean;
        /**
         * Whether the arguments should be processed as pgfkeys-type arguments.
         *
         * @type {boolean}
         */
        pgfkeysArgs?: boolean;
        /**
         * Whether there should be line breaks before and after the macro
         * (e.g., like the \section{...} command.)
         *
         * @type {boolean}
         */
        breakAround?: boolean;
        /**
         * Whether the contents of the macro should be assumed to be in math mode.
         *
         * @type {boolean}
         */
        inMathMode?: boolean;
        /**
         * Whether the arguments should be rendered with a hanging indent when the wrap
         * (like the arguments to \item in an enumerate environment.)
         *
         * @type {boolean}
         */
        hangingIndent?: boolean;
    };
    /**
     * The macro signature as an xparse argument specification string.
     *
     * @type {string}
     */
    signature?: string;
};

/**
 * Walk the AST and replace a node with `callback(node)` whenever
 * `callbackTrigger(node)` returns true.
 *
 * @param {object} ast
 * @param {function} callback
 * @param {function} [callbackTrigger=() => false]
 * @param {{triggerTime: string}} - "early" indicates that `callback` is called before `walkAst` recurses down the tree. "late" calls `callback` after it has recursed.
 * @returns {object}
 */
export function walkAst<T extends any>(
    ast: Ast.Ast,
    callback: (ast: T) => T,
    callbackTrigger: (node: any) => node is T = ((node: Ast.Ast) =>
        false) as any,
    options: { triggerTime: "early" | "late" } = { triggerTime: "early" }
): Ast.Ast {
    function reapply(node: Ast.Ast) {
        return walkAst(node, callback, callbackTrigger);
    }

    if (ast == null) {
        // Early or late, we callback right before getting a null value
        if (callbackTrigger(ast)) {
            return callback(ast) as Ast.Ast;
        }
        return ast;
    }

    if (options.triggerTime === "early") {
        if (callbackTrigger(ast)) {
            (ast as any) = callback(ast);
        }
    }

    if (Array.isArray(ast)) {
        ast = ast.map(reapply) as Ast.Node[];
        // run `callback` after recursion for "late" trigger
        if (options.triggerTime === "late") {
            if (callbackTrigger(ast)) {
                (ast as any) = callback(ast);
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
    for (const prop of childProps) {
        if (prop in ret) {
            (ret as any)[prop] = reapply((ret as any)[prop]);
        }
    }
    // run `callback` after recursion for "late" trigger
    if (options.triggerTime === "late") {
        if (callbackTrigger(ret)) {
            (ret as any) = callback(ret);
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

/**
 * Removes any `_renderInfo` tags present in the AST.
 *
 * @export
 * @param {*} ast
 * @returns
 */
export function trimRenderInfo(ast: Ast.Ast) {
    return walkAst(
        ast,
        (node) => {
            const ret = { ...node };
            delete ret._renderInfo;
            return ret;
        },
        ((node) =>
            node != null &&
            (node as Ast.Node)._renderInfo != null) as Ast.TypeGuard<Ast.Node>
    );
}

/**
 * Trims whitespace and parbreaks from the start and end
 * of an array.
 *
 * @export
 * @param {[object]} ast
 * @returns {[object]}
 */
export function trim(ast: Ast.Node[]): Ast.Node[];
export function trim(ast: Ast.Ast): Ast.Ast;
export function trim(ast: Ast.Node[] | Ast.Ast): any {
    if (!Array.isArray(ast)) {
        console.warn("Trying to trim a non-array ast", ast);
        return ast;
    }
    if (ast.length === 0) {
        return ast;
    }

    let leftTrim = 0;
    let rightTrim = 0;

    // Find the padding on the left
    for (const node of ast) {
        if (match.whitespace(node) || match.parbreak(node)) {
            leftTrim++;
        } else {
            break;
        }
    }

    // Find the padding on the right
    for (let i = ast.length - 1; i >= 0; i--) {
        const node = ast[i];
        if (match.whitespace(node) || match.parbreak(node)) {
            rightTrim++;
        } else {
            break;
        }
    }

    if (leftTrim === 0 && rightTrim === 0) {
        return ast;
    }

    const ret = ast.slice(leftTrim, ast.length - rightTrim);
    // Special care must be taken because the content could have a comment
    // in it. If the comment was on the same line as a parskip, it will no
    // longer be on the same line after the trimming. Thus, we must modify
    // the comment.
    if (ret.length > 0 && leftTrim > 0) {
        const firstToken = ret[0];
        if (match.comment(firstToken) && firstToken.sameline) {
            ret.shift();
            ret.unshift({ ...firstToken, sameline: false });
        }
    }

    return ret;
}

/**
 * Updates the `._renderInfo` property on a node to include
 * whatever has been supplied to `renderInfo`. If `renderInfo`
 * is null, no update is performed.
 *
 * *This operation is destructive*
 *
 * @param {*} node
 * @param {object|null} renderInfo
 * @returns
 */
export function updateRenderInfo(
    node: Ast.Node,
    renderInfo: object | null | undefined
) {
    if (renderInfo != null) {
        node._renderInfo = { ...(node._renderInfo || {}), ...renderInfo };
    }
    return node;
}

/**
 * Gobbles an argument of whose type is specified
 * by `argSpec` starting at the position `startPos`. If an argument couldn't be found,
 * `argument` will be `null`.
 *
 * @export
 * @param {Node[]} nodes
 * @param {ArgSpec.Node} argSpec
 * @param {number} [startPos=0]
 * @returns {{
 *     before: Node[];
 *     after: Node[];
 *     argument: Node[];
 * }}
 */
export function gobbleSingleArgument(
    nodes: Ast.Node[],
    argSpec: ArgSpec.Node,
    startPos = 0
): {
    rest: Ast.Node[];
    argument: Ast.Argument | null;
} {
    if (typeof argSpec === "string" || !argSpec.type) {
        throw new Error(
            `argSpec must be an already-parsed argument specification, not "${JSON.stringify(
                argSpec
            )}"`
        );
    }

    const rest: Ast.Node[] = nodes.slice(startPos);
    let argument: Ast.Argument | null = null;
    // When we consume whitespace, we might also consume some comments
    // We collect these comments so they aren't lost.
    // XXX: see TODO note; comments aren't skipped at the moment
    const comments: Ast.Node[] = [];

    let currPos = startPos;

    // Gobble whitespace from `currPos` onward, updating `currPos`.
    // If `argSpec` specifies leading whitespace is not allowed,
    // this function does nothing.
    const gobbleWhitespace = (argSpec as any).noLeadingWhitespace
        ? () => {}
        : () => {
              while (currPos < nodes.length) {
                  const node = nodes[currPos];
                  if (node.type === "whitespace") {
                      currPos++;
                      continue;
                  }
                  // TODO: think about whether comments should be handled or not
                  //if (node.type === "comment") {
                  //    currPos++;
                  //    comments.push(node);
                  //    continue;
                  //}
                  break;
              }
          };

    const openMark: string = (argSpec as any).openBrace || "";
    const closeMark: string = (argSpec as any).closeBrace || "";

    // Only mandatory arguments can be wrapped in {...}.
    // Since we already parse such things as groups, we need to
    // check the open and closing symbols to see if we allow for
    // groups to be accepted as arguments
    const acceptGroup =
        argSpec.type === "mandatory" && openMark === "{" && closeMark === "}";

    // Find the position of the open brace and the closing brace.
    // The position(s) are null if the brace isn't found.
    function findBracePositions(): [number | null, number | null] {
        let openMarkPos: number | null = null;
        if (openMark) {
            openMarkPos =
                nodes
                    .slice(currPos)
                    .findIndex((node) => match.string(node, openMark)) +
                currPos;
            if (openMarkPos < currPos) {
                openMarkPos = null;
            }
        }
        let closeMarkPos: number | null = null;
        if (openMarkPos != null) {
            closeMarkPos =
                nodes
                    .slice(openMarkPos + 1)
                    .findIndex((node) => match.string(node, closeMark)) +
                openMarkPos +
                1;
            if (closeMarkPos < openMarkPos + 1) {
                closeMarkPos = null;
            }
        }
        return [openMarkPos, closeMarkPos];
    }

    gobbleWhitespace();
    const currNode = nodes[currPos];
    if (
        currNode == null ||
        match.comment(currNode) ||
        match.parbreak(currNode)
    ) {
        return { rest, argument };
    }
    switch (argSpec.type) {
        case "mandatory":
            if (acceptGroup) {
                let content: Ast.Node[] = [currNode];
                if (match.group(currNode)) {
                    // Unwrap a group if there is one.
                    content = currNode.content;
                }
                argument = {
                    type: "argument",
                    content,
                    openMark: "{",
                    closeMark: "}",
                };
                rest.length = 0;
                rest.push(...nodes.slice(currPos + 1));
                break;
            }
        // The fallthrough here is on purpose! Matching a mandatory
        // argument and an optional argument is the same for our purposes.
        // We're not going to fail to parse because of a missing argument.
        case "optional":
            // We have already gobbled whitespace, so at this point, `currNode`
            // is either an openMark or we don't have an optional argument.
            if (match.string(currNode, openMark)) {
                // If we're here, we have custom braces to match
                const [openMarkPos, closeMarkPos] = findBracePositions();
                if (openMarkPos != null && closeMarkPos != null) {
                    argument = {
                        type: "argument",
                        content: nodes.slice(openMarkPos + 1, closeMarkPos),
                        openMark: openMark,
                        closeMark: closeMark,
                    };
                    rest.length = 0;
                    rest.push(...nodes.slice(closeMarkPos + 1));
                    break;
                }
            }
            break;
        case "optionalStar":
            if (match.string(currNode, "*")) {
                argument = {
                    type: "argument",
                    content: [currNode],
                    openMark: "",
                    closeMark: "",
                };
                rest.length = 0;
                rest.push(...nodes.slice(currPos + 1));
                break;
            }
            break;
        default:
            console.warn(
                `Don't know how to find an argument of argspec type "${argSpec.type}"`
            );
    }

    return { rest, argument };
}

/**
 * Search (in a right-associative way) through the array for instances of
 * `macroName` and attach arguments to the macro. Argument signatures are
 * specified by `macroInfo.signature`.
 *
 * Info stored in `macroInfo.renderInfo` will be attached to the node
 * with attribute `_renderInfo`.
 *
 * @param {[object]} ast
 * @param {string} macroName
 * @param {object} macroInfo
 * @returns {[object]}
 */
export function attachMacroArgsInArray(
    ast: Ast.Node[],
    macros: {
        [macroName: string]: {
            signature?: string;
            renderInfo?: object;
        };
    }
): Ast.Node[] {
    // Some preliminaries that are only used if `ast` is an array.
    let currIndex: number;
    const macroNames = Object.keys(macros);

    function gobbleUntilMacro() {
        // Step backwards until we find the required macro
        while (
            currIndex >= 0 &&
            !macroNames.some((macroName) =>
                match.macro(ast[currIndex], macroName)
            )
        ) {
            currIndex--;
        }
    }

    // Search for an occurrence of any of the macros `macroName` and its arguments.
    // Some macros are right-associative, so we should start searching from
    // the right
    currIndex = ast.length - 1;
    while (currIndex >= 0) {
        gobbleUntilMacro();
        if (currIndex < 0) {
            // We didn't find an occurrence of the macro
            return ast;
        }

        // Store the currIndex, which is where the macro is. Start searching
        // for its arguments at the next index.
        const macroIndex = currIndex;
        const macro: Ast.Macro = ast[macroIndex] as Ast.Macro;
        const macroName = macro.content;
        const macroInfo = macros[macroName];

        // Add `._renderInfo` if we have any
        updateRenderInfo(macro, macroInfo.renderInfo);

        // We don't want to search for macro arguments if we already
        // found them. If the macro has arguments, we assume that
        // they've already been attached
        if (macro.args != null) {
            currIndex = macroIndex - 1;
            continue;
        }

        const args: Ast.Argument[] = [];
        // `currIndex` is the position of the macro. We want to start
        // looking for the arguments right after the macro
        currIndex++;
        let rest = ast.slice(currIndex);
        // At this point, we've found the macro, so collect its arguments
        for (const argSpec of parseArgspec(macroInfo.signature)) {
            const { rest: after, argument } = gobbleSingleArgument(
                rest,
                argSpec
            );
            if (argument) {
                // If we found an argument keep it for later
                args.push(argument);
            } else {
                // If we didn't find an argument, it was probably an optional
                // argument. We want to preserve the number of arguments
                // so that if we choose to "execute" this macro, it will be easy
                // to find what corresponds to #1,#2, etc.. So, we push a blank argument.
                args.push({
                    type: "argument",
                    openMark: "",
                    closeMark: "",
                    content: [],
                });
            }
            rest = after;
        }
        if (args.length > 0) {
            // If we found arguments, we need to attach them to the macro
            const newMacro: Ast.Macro = { ...macro, args };
            ast = ast.slice(0, macroIndex).concat([newMacro]).concat(rest);
        }
        // After we've gobbled the arguments, set
        // ourselves one space before the macro so we can continue.
        currIndex = macroIndex - 1;
    }

    return ast;
}

/**
 * Search from the start of an array and pick off any arguments matching the passed-in
 * argspec string.
 *
 * @param {[object]} ast
 * @param {string} macroName
 * @param {object} macroInfo
 * @returns {[object]}
 */
export function getArgsInArray(
    ast: Ast.Node[],
    signature: string
): {
    arguments: Ast.Argument[];
    rest: Ast.Node[];
} {
    const args: Ast.Argument[] = [];
    let rest = ast;
    for (const argSpec of parseArgspec(signature)) {
        const { rest: after, argument } = gobbleSingleArgument(rest, argSpec);
        if (argument) {
            // If we found an argument keep it for later
            args.push(argument);
        }
        rest = after;
    }

    return { arguments: args, rest };
}

/**
 * Recursively search for and attach the arguments for a
 * particular macro to its AST node. `macroInfo` should
 * contain a `signature` property which specifies the arguments
 * signature in xparse syntax.
 *
 * @param {object} ast
 * @param {string} macroName
 * @param {object} macroInfo
 * @returns - a new AST
 */
export function attachMacroArgs(
    ast: Ast.Ast,
    macros: { [macroName: string]: { signature?: string; renderInfo?: object } }
) {
    // We only gobble arguments when we find a macro in an array, so
    // recurse looking for arrays and then gobble.
    return walkAst(
        ast,
        (node) => {
            // attach the macro's arguments to its `.args` property
            return attachMacroArgsInArray(node as Ast.Node[], macros);
        },
        Array.isArray,
        { triggerTime: "late" }
    );
}

/**
 * Recursively search for and process an environment. Arguments are
 * consumed according to the `signature` specified. The body is processed
 * with the specified `processContent` function (if specified). Any specified `renderInfo`
 * is attached to the environment node.
 *
 * @param {object} ast
 * @param {string} envName
 * @param {object} envInfo
 * @returns - a new AST
 */
export function processEnvironment(
    ast: Ast.Ast,
    envName: string,
    envInfo: EnvInfo
) {
    return walkAst(
        ast,
        (node: Ast.Environment) => {
            const ret = { ...node };
            // We don't process arguments if there is an existing `args` property.
            if (typeof envInfo.signature === "string" && ret.args == null) {
                const { arguments: args, rest } = getArgsInArray(
                    ret.content,
                    envInfo.signature
                );
                if (args.length > 0) {
                    ret.args = args;
                    ret.content = rest;
                }
            }

            updateRenderInfo(ret, envInfo.renderInfo);
            if (typeof envInfo.processContent === "function") {
                // process the body of the environment if a processing function was supplied
                ret.content = envInfo.processContent(ret.content);
            }

            return ret;
        },
        ((node: Ast.Ast) =>
            match.environment(node, envName)) as Ast.TypeGuard<Ast.Environment>
    );
}

/**
 * Functions to match different types of nodes.
 */
export const match = {
    macro(node: any, macroName?: string): node is Ast.Macro {
        if (node == null) {
            return false;
        }
        return (
            node.type === "macro" &&
            (macroName == null || node.content === macroName)
        );
    },
    environment(node: any, envName?: string): node is Ast.Environment {
        if (node == null) {
            return false;
        }
        return (
            (node.type === "environment" || node.type === "mathenv") &&
            (envName == null || printRaw(node.env) === envName)
        );
    },
    comment(node: any): node is Ast.Comment {
        if (node == null) {
            return false;
        }
        return node.type === "comment";
    },
    parbreak(node: any): node is Ast.Parbreak {
        if (node == null) {
            return false;
        }
        return node.type === "parbreak";
    },
    whitespace(node: any): node is Ast.Whitespace {
        if (node == null) {
            return false;
        }
        return node.type === "whitespace";
    },
    string(node: any, value?: string): node is Ast.String {
        if (node == null) {
            return false;
        }
        return (
            node.type === "string" && (value == null || node.content === value)
        );
    },
    group(node: any): node is Ast.Group {
        if (node == null) {
            return false;
        }
        return node.type === "group";
    },
    argument(node: any): node is Ast.Argument {
        if (node == null) {
            return false;
        }
        return node.type === "argument";
    },
    blankArgument(node: any): boolean {
        if (!match.argument(node)) {
            return false;
        }
        return (
            node.openMark === "" &&
            node.closeMark === "" &&
            node.content.length === 0
        );
    },
};
