import { Plugin, Parser } from "unified";
import * as Ast from "../../unified-latex-types";
import { parseMathMinimal, parseMinimal } from "./parse-minimal";

export type ParserOptions = { mode: "math" | "regular" } | undefined;

/**
 * Parse a string to a LaTeX AST with no post processing. For example,
 * no macro arguments will be attached, etc.
 */
export const unifiedLatexFromStringMinimal: Plugin<
    ParserOptions[],
    string,
    Ast.Root
> = function unifiedLatexFromStringMinimal(options) {
    const parser: Parser<Ast.Root> = (str) => {
        if (options?.mode === "math") {
            return {
                type: "root",
                content: parseMathMinimal(str),
                _renderInfo: { inMathMode: true },
            };
        }
        return parseMinimal(str);
    };

    Object.assign(this, { Parser: parser });
};
