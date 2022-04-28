import * as Ast from "../libs/ast-types";
import { GlueParser } from "./pegjs-parsers";

type Position = { offset: number; line: number; column: number };
type Dim = { type: "dim"; value: number; unit: string };
type Glue = {
    type: "glue";
    fixed: Dim;
    stretchable: Dim | null;
    shrinkable: Dim | null;
    position: { start: Position; end: Position };
};

/**
 * Prints a `Glue` object to an AST. After printing, `glue`
 * is turned into a sequence of string and whitespace nodes.
 * All structural information about the glue is lost.
 */
export function printGlue(glue: Glue): Ast.Node[] {
    const ret: Ast.Node[] = [
        { type: "string", content: `${glue.fixed.value}${glue.fixed.unit}` },
    ];
    if (glue.stretchable) {
        ret.push({ type: "whitespace" });
        ret.push({ type: "string", content: "plus" });
        ret.push({ type: "whitespace" });
        ret.push({
            type: "string",
            content: `${glue.stretchable.value}${glue.stretchable.unit}`,
        });
    }
    if (glue.shrinkable) {
        ret.push({ type: "whitespace" });
        ret.push({ type: "string", content: "minus" });
        ret.push({ type: "whitespace" });
        ret.push({
            type: "string",
            content: `${glue.shrinkable.value}${glue.shrinkable.unit}`,
        });
    }

    return ret;
}

/**
 * Parse a string that starts with TeX glue (e.g. `1pt` or `1pt plus 2em`).
 * It is assumed that all whitespace and comments have been stripped from the glue
 */
export function parseTexGlue(source: string): Glue | null {
    // matchers are passed in via the second argument (the `options` argument)
    // so they are available from within the Pegjs grammar.
    try {
        return GlueParser.parse(source);
    } catch {}
    return null;
}
