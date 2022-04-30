import util from "util";

import * as latexParser from "../parsers/latex-parser";
import { trimRenderInfo } from "../libs/ast";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("Processing environments tests", () => {
    // This test relates to the direct parsing of an environment tp an AST
    it("environment's body is processed to remove surrounding whitespace", () => {
        let ast = trimRenderInfo(
            latexParser.parse("\\begin{xxx}\n\nx\n\\end{xxx}")
        );
        let targetAst = {
            type: "root",
            content: [
                {
                    type: "environment",
                    env: [{ type: "string", content: "xxx" }],
                    content: [{ type: "string", content: "x" }],
                },
            ],
        };
        expect(ast).toEqual(targetAst);

        // parbreaks after sameline leading comments are removed
        ast = trimRenderInfo(
            latexParser.parse("\\begin{xxx}%\n\nx\n\\end{xxx}")
        );
        targetAst = {
            type: "root",
            content: [
                {
                    type: "environment",
                    env: [{ type: "string", content: "xxx" }],
                    content: [
                        {
                            type: "comment",
                            content: "",
                            suffixParbreak: false,
                            sameline: true,
                            leadingWhitespace: false,
                        },
                        { type: "string", content: "x" },
                    ],
                },
            ],
        };
        expect(ast).toEqual(targetAst);

        // no whitespace is included after sameline leading comment
        ast = trimRenderInfo(latexParser.parse("\\begin{xxx}%\nx\n\\end{xxx}"));
        targetAst = {
            type: "root",
            content: [
                {
                    type: "environment",
                    env: [{ type: "string", content: "xxx" }],
                    content: [
                        {
                            type: "comment",
                            content: "",
                            suffixParbreak: false,
                            sameline: true,
                            leadingWhitespace: false,
                        },
                        { type: "string", content: "x" },
                    ],
                },
            ],
        };
        expect(ast).toEqual(targetAst);
    });
});
