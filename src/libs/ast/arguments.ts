import * as Ast from "../ast-types";
import * as ArgSpec from "../argspec-types";
import { match } from "./matchers";
import { walkAst } from "./walkers";
import { parse as parseArgspec } from "../argspec-parser";
import { updateRenderInfo } from "./render-info";
import { SpecialMacroSpec } from "../../package-specific-macros/types";

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
    macros: SpecialMacroSpec
): Ast.Node[] {
    // Some preliminaries that are only used if `ast` is an array.
    let currIndex: number;
    const macroNames = Object.keys(macros);
    /**
     * Determine whether `node` matches one of the macros in `macros`.
     * Care is taken when matching because not all macros have
     * `\` as their escape token.
     */
    const matchesListedMacro = match.createMacroMatcher(macros);

    function gobbleUntilMacro() {
        // Step backwards until we find the required macro
        while (currIndex >= 0 && !matchesListedMacro(ast[currIndex])) {
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
 * Extract the contents of a macro's arguments. If an argument was omitted (e.g.,
 * because it was an optional arg that wasn't included), then `null` is returned.
 */
export function argContentsFromMacro(
    macro: Ast.Macro | Ast.Environment
): (Ast.Node[] | null)[] {
    if (!Array.isArray(macro.args)) {
        return [];
    }

    return macro.args.map((arg) => {
        if (arg.openMark === "" && arg.content.length === 0) {
            return null;
        }
        return arg.content;
    });
}
