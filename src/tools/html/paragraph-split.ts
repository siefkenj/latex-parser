import { tagLikeMacro } from "..";
import { match, trim } from "../../libs/ast";
import * as Ast from "../../libs/ast-types";

/**
 * Takes an array of nodes and splits it into chunks that should be wrapped
 * in HTML `<p>...</p>` tags, vs. not. By default environments are not wrapped
 * unless they are specified, and macros are included in a par unless they are excluded.
 *
 */
function splitForPars(
    nodes: Ast.Node[],
    options: {
        macrosThatBreakPars: string[];
        environmentsThatDontBreakPars: string[];
    }
): { content: Ast.Node[]; wrapInPar: boolean }[] {
    const ret: { content: Ast.Node[]; wrapInPar: boolean }[] = [];
    let currBody: Ast.Node[] = [];
    nodes = trim(nodes);

    const isParBreakingMacro = match.createMacroMatcher(
        options.macrosThatBreakPars
    );
    const isEnvThatShouldNotBreakPar = match.createEnvironmentMatcher(
        options.environmentsThatDontBreakPars
    );

    /**
     * Push and clear the contents of `currBody` to the return array.
     * If there are any contents, it should be wrapped in an array.
     */
    function pushBody() {
        if (currBody.length > 0) {
            ret.push({ content: trim(currBody), wrapInPar: true });
            currBody = [];
        }
    }

    for (const node of nodes) {
        if (isParBreakingMacro(node)) {
            pushBody();
            ret.push({ content: [node], wrapInPar: false });
            continue;
        }
        if (match.anyEnvironment(node) && !isEnvThatShouldNotBreakPar(node)) {
            pushBody();
            ret.push({ content: [node], wrapInPar: false });
            continue;
        }
        if (match.parbreak(node) || match.macro(node, "par")) {
            pushBody();
            continue;
        }
        currBody.push(node);
    }
    pushBody();

    return ret;
}

/**
 * Wrap paragraphs in `<p>...</p>` tags.
 *
 * Paragraphs are inserted at
 *   * parbreak tokens
 *   * macros listed in `macrosThatBreakPars`
 *   * environments not listed in `environmentsThatDontBreakPars`
 */
export function wrapPars(
    nodes: Ast.Node[],
    options: {
        macrosThatBreakPars: string[];
        environmentsThatDontBreakPars: string[];
    } = {
        macrosThatBreakPars: [
            "part",
            "chapter",
            "section",
            "subsection",
            "subsubsection",
            "vspace"
        ],
        environmentsThatDontBreakPars: [],
    }
): Ast.Node[] {
    const parSplits = splitForPars(nodes, options);

    return parSplits.flatMap((part) => {
        if (part.wrapInPar) {
            return tagLikeMacro({ tag: "p", content: part.content });
        } else {
            return part.content;
        }
    });
}
