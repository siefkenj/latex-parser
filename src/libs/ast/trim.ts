import {
    trim as trimMutate,
    trimEnd,
    trimStart,
} from "../../unified-latex/unified-latex-util-trim";
import * as Ast from "../ast-types";

/**
 * Trims whitespace and parbreaks from the start and end
 * of an array.
 */
export function trim(ast: Ast.Node[]): Ast.Node[] {
    const clone = [...ast];
    trimMutate(clone);
    return clone;
}

/**
 * Trim whitespace and parbreaks from the left of an array.
 */
export function trimLeft(ast: Ast.Node[]): Ast.Node[] {
    const clone = [...ast];
    trimStart(clone);
    return clone;
}

/**
 * Trim whitespace and parbreaks from the right of an array.
 */
export function trimRight(ast: Ast.Node[]): Ast.Node[] {
    const clone = [...ast];
    trimEnd(clone);
    return clone;
}
