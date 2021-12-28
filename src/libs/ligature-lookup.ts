import { match } from "./ast";
import * as Ast from "./ast-types";
import unicodeLigatures from "../tables/ligature-macros.json";

function makeString(content: string): Ast.String {
    return { type: "string", content };
}

const mappedLigatures: [string, Ast.String][] = unicodeLigatures.map(
    ([macro, str]) => [macro, makeString(str)]
);

const SUBSTITUTION_MAP: Map<string, Ast.String> = new Map([
    ["- - -", makeString("—")],
    ["- -", makeString("–")],
    ["` `", makeString("“")],
    ["' '", makeString("”")],
    ["`", makeString("‘")],
    ["'", makeString("’")],
    ["\\$", makeString("$")],
    ["\\%", makeString("%")],
    ["\\_", makeString("_")],
    ["\\&", makeString("&")],
    ["\\#", makeString("#")],
    ["\\{", makeString("{")],
    ["\\}", makeString("}")],
    ["\\P", makeString("¶")],
    ["\\S", makeString("§")],
    ["\\dots", makeString("…")],
    ["\\pounds", makeString("£")],
    ...mappedLigatures,
]);

/**
 * Hash a sequence of nodes for quick lookup. This function assumes
 * that a space character does not appear in the content of any of the nodes.
 */
function hashNodes(nodes: (Ast.Macro | Ast.String)[]): string {
    return nodes
        .map((node) => (match.macro(node) ? `\\${node.content}` : node.content))
        .join(" ");
}

function isMacroOrStringArray(
    nodes: Ast.Node[]
): nodes is (Ast.Macro | Ast.String)[] {
    return nodes.some((node) => match.macro(node) || match.string(node));
}

/**
 * Map a sequence of nodes to its corresponding unicode ligature. E.g.,
 * `---` will be converted to `–` (an em-dash).
 *
 * This function assumes that `nodes` is a pure token stream with all whitespace
 * removed and an surrogate letters popped from their groups. (e.g. `\: o` and `\:{o}`
 * should be normalized to `["\:", "o"]` before calling this function.)
 */
export function ligatureToUnicode(nodes: Ast.Node[]): Ast.String | null {
    if (!isMacroOrStringArray(nodes)) {
        return null;
    }
    return SUBSTITUTION_MAP.get(hashNodes(nodes)) || null;
}
