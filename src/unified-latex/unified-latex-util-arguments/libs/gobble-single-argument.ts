import { ArgSpecAst as ArgSpec } from "../../unified-latex-util-argspec";
import * as Ast from "../../unified-latex-types";
import { match } from "../../unified-latex-util-match";
import { arg } from "../../unified-latex-builder";

/**
 * Gobbles an argument of whose type is specified
 * by `argSpec` starting at the position `startPos`. If an argument couldn't be found,
 * `argument` will be `null`.
 */
export function gobbleSingleArgument(
    nodes: Ast.Node[],
    argSpec: ArgSpec.Node,
    startPos = 0
): {
    argument: Ast.Argument | null;
    nodesRemoved: number;
} {
    if (typeof argSpec === "string" || !argSpec.type) {
        throw new Error(
            `argSpec must be an already-parsed argument specification, not "${JSON.stringify(
                argSpec
            )}"`
        );
    }

    let argument: Ast.Argument | null = null;

    let currPos = startPos;

    // Gobble whitespace from `currPos` onward, updating `currPos`.
    // If `argSpec` specifies leading whitespace is not allowed,
    // this function does nothing.
    const gobbleWhitespace = (argSpec as ArgSpec.LeadingWhitespace)
        .noLeadingWhitespace
        ? () => {}
        : () => {
              while (currPos < nodes.length) {
                  if (!match.whitespace(nodes[currPos])) {
                      break;
                  }
                  currPos++;
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
            openMarkPos = nodes.findIndex(
                (node, i) => i >= currPos && match.string(node, openMark)
            );
            if (openMarkPos < currPos) {
                openMarkPos = null;
            }
        }
        let closeMarkPos: number | null = null;
        if (openMarkPos != null) {
            closeMarkPos = nodes.findIndex(
                (node, i) =>
                    i >= (openMarkPos as number) + 1 &&
                    match.string(node, closeMark)
            );
            if (closeMarkPos < openMarkPos + 1) {
                closeMarkPos = null;
            }
        }
        return [openMarkPos, closeMarkPos];
    }

    // Do the actual matching
    gobbleWhitespace();
    const currNode = nodes[currPos];
    if (
        currNode == null ||
        match.comment(currNode) ||
        match.parbreak(currNode)
    ) {
        return { argument, nodesRemoved: 0 };
    }

    switch (argSpec.type) {
        case "mandatory":
            if (acceptGroup) {
                let content: Ast.Node[] = [currNode];
                if (match.group(currNode)) {
                    // Unwrap a group if there is one.
                    content = currNode.content;
                }
                argument = arg(content, {
                    openMark,
                    closeMark,
                });
                currPos++;
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
                    argument = arg(nodes.slice(openMarkPos + 1, closeMarkPos), {
                        openMark,
                        closeMark,
                    });
                    currPos = closeMarkPos + 1;
                    break;
                }
            }
            break;
        case "optionalStar":
            if (match.string(currNode, "*")) {
                argument = arg([currNode], { openMark: "", closeMark: "" });
                currPos++;
                break;
            }
            break;
        default:
            console.warn(
                `Don't know how to find an argument of argspec type "${argSpec.type}"`
            );
    }

    // `currPos` is has already stepped past any whitespace. However,
    // if we did not consume an argument, we don't want to consume the whitespace.
    const nodesRemoved = argument ? currPos - startPos : 0;
    nodes.splice(startPos, nodesRemoved);
    return { argument, nodesRemoved };
}
