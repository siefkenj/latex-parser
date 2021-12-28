import * as Ast from "../ast-types";
import { match } from "./matchers";

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
