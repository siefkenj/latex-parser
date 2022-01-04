import * as Ast from "../libs/ast-types";
import { argContentsFromMacro } from "../libs/ast/arguments";
import { printRaw } from "../libs/print-raw";
import { xcolorColorToHex } from "../libs/xcolor/xcolor";
import { deleteComments } from "./macro-replacers";

/**
 * Compute the hex representation of a color specified by an xcolor color command.
 * For example `\color[rgb]{1 .5 .5}` or `\textcolor{red}{foo}`. If the color cannot be parsed,
 * `null` is returned for the hex value. In all cases a css variable name (prefixed with "--"")
 * is returned. This can be used to set up CSS for custom colors.
 */
export function xcolorMacroToHex(node: Ast.Macro): {
    hex: string | null;
    cssVarName: string;
} {
    // We assume the node has signature "o m" where o is the model and
    // m is the color spec.

    const args = argContentsFromMacro(node);
    const model = args[0] && printRaw(deleteComments(args[0]));
    const colorStr = printRaw(deleteComments(args[1] || []));
    let hex: string | null = null;
    try {
        hex = xcolorColorToHex(colorStr, model);
    } catch (e) {}

    const cssVarName = "--" + colorStr.replace(/[^a-zA-Z0-9-_]/g, "-");

    return { hex, cssVarName };
}
