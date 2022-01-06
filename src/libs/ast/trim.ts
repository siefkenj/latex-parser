import * as Ast from "../ast-types";
import { match } from "./matchers";

/**
 * Trims whitespace and parbreaks from the start and end
 * of an array.
 */
export function trim(ast: Ast.Node[]): Ast.Node[] {
    if (!Array.isArray(ast)) {
        console.warn("Trying to trim a non-array ast", ast);
        return ast;
    }
    const { start, end } = amountOfLeadingAndTrailingWhitespace(ast);
    const firstToken = ast[0];
    if (start === 0 && end === 0) {
        if (match.comment(firstToken) && firstToken.leadingWhitespace) {
            return [
                { ...firstToken, leadingWhitespace: false },
                ...ast.slice(1),
            ];
        }
        return ast;
    }
    const ret = ast.slice(start, ast.length - end);
    // If we have a comment with leading whitespace, we should remove the leading whitespace.
    if (ret.length > 0 && match.comment(ret[0]) && ret[0].leadingWhitespace) {
        const firstToken = ret[0];
        ret[0] = { ...firstToken, leadingWhitespace: false };
    }

    // Special care must be taken because the content could have a comment
    // in it. If the comment was on the same line as a parskip, it will no
    // longer be on the same line after the trimming. Thus, we must modify
    // the comment.
    if (ret.length > 0 && start > 0) {
        const firstToken = ret[0];
        if (match.comment(firstToken) && firstToken.sameline) {
            ret.shift();
            ret.unshift({
                ...firstToken,
                sameline: false,
                leadingWhitespace: false,
            });
        }
    }
    return ret;
}

/**
 * Trim whitespace and parbreaks from the left of an array.
 */
export function trimLeft(ast: Ast.Node[]): Ast.Node[] {
    const { start } = amountOfLeadingAndTrailingWhitespace(ast);
    if (start === 0) {
        return ast;
    }
    return ast.slice(start, ast.length);
}

/**
 * Trim whitespace and parbreaks from the right of an array.
 */
export function trimRight(ast: Ast.Node[]): Ast.Node[] {
    const { end } = amountOfLeadingAndTrailingWhitespace(ast);
    if (end === 0) {
        return ast;
    }
    return ast.slice(0, ast.length - end);
}

/**
 * Returns the number of whitespace/parbreak nodes at the start and end of an array.
 */
function amountOfLeadingAndTrailingWhitespace(ast: Ast.Node[]): {
    start: number;
    end: number;
} {
    let start = 0;
    let end = 0;
    for (const node of ast) {
        if (match.whitespace(node) || match.parbreak(node)) {
            start++;
        } else {
            break;
        }
    }

    if (start === ast.length) {
        return { start, end: 0 };
    }

    // Find the padding on the right
    for (let i = ast.length - 1; i >= 0; i--) {
        const node = ast[i];
        if (match.whitespace(node) || match.parbreak(node)) {
            end++;
        } else {
            break;
        }
    }

    return { start, end };
}
