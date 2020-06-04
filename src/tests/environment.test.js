import util from "util";

import * as latexParser from "../parsers/latex-parser";
import { processEnvironment } from "../libs/ast";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("Processing environments tests", () => {
    it("attach one mandatory argument to an environment", () => {
        let targetAst;
        let ast = latexParser.parse("\\begin{xxx}\\end{xxx}");
        let subbedAst = processEnvironment(ast, "xxx", { signature: "m" });
        expect(subbedAst).toEqual(ast);

        ast = latexParser.parse("\\begin{xxx}a b c\\end{xxx}");
        subbedAst = processEnvironment(ast, "xxx", { signature: "m" });
        targetAst = {
            type: "root",
            content: [
                {
                    type: "environment",
                    env: [{ type: "string", content: "xxx" }],
                    content: [
                        { type: "whitespace" },
                        { type: "string", content: "b" },
                        { type: "whitespace" },
                        { type: "string", content: "c" },
                    ],
                    args: [
                        {
                            type: "argument",
                            content: [{ type: "string", content: "a" }],
                            openMark: "{",
                            closeMark: "}",
                        },
                    ],
                },
            ],
        };
        expect(subbedAst).toEqual(targetAst);

        ast = latexParser.parse("\\begin{xxx} a b c\\end{xxx}");
        subbedAst = processEnvironment(ast, "xxx", { signature: "m" });
        expect(subbedAst).toEqual(targetAst);

        ast = latexParser.parse("\\begin{xxx}{a} b c\\end{xxx}");
        subbedAst = processEnvironment(ast, "xxx", { signature: "m" });
        expect(subbedAst).toEqual(targetAst);

        ast = latexParser.parse("\\begin{xxx}%\n{a} b c\\end{xxx}");
        subbedAst = processEnvironment(ast, "xxx", { signature: "m" });
        expect(subbedAst).not.toEqual(targetAst);
    });
    it("attach two mandatory argument to an environment", () => {
        let targetAst;
        let ast = latexParser.parse("\\begin{xxx}\\end{xxx}");
        let subbedAst = processEnvironment(ast, "xxx", { signature: "m m" });
        expect(subbedAst).toEqual(ast);

        ast = latexParser.parse("\\begin{xxx}a b c\\end{xxx}");
        subbedAst = processEnvironment(ast, "xxx", { signature: "m m" });
        targetAst = {
            type: "root",
            content: [
                {
                    type: "environment",
                    env: [{ type: "string", content: "xxx" }],
                    content: [
                        { type: "whitespace" },
                        { type: "string", content: "c" },
                    ],
                    args: [
                        {
                            type: "argument",
                            content: [{ type: "string", content: "a" }],
                            openMark: "{",
                            closeMark: "}",
                        },
                        {
                            type: "argument",
                            content: [{ type: "string", content: "b" }],
                            openMark: "{",
                            closeMark: "}",
                        },
                    ],
                },
            ],
        };
        expect(subbedAst).toEqual(targetAst);

        ast = latexParser.parse("\\begin{xxx} a b c\\end{xxx}");
        subbedAst = processEnvironment(ast, "xxx", { signature: "m m" });
        expect(subbedAst).toEqual(targetAst);

        ast = latexParser.parse("\\begin{xxx}{a} b c\\end{xxx}");
        subbedAst = processEnvironment(ast, "xxx", { signature: "m m" });
        expect(subbedAst).toEqual(targetAst);

        ast = latexParser.parse("\\begin{xxx}%\n{a} b c\\end{xxx}");
        subbedAst = processEnvironment(ast, "xxx", { signature: "m m" });
        expect(subbedAst).not.toEqual(targetAst);
    });
    it("attach optional and mandatory argument to an environment", () => {
        let targetAst;
        let ast = latexParser.parse("\\begin{xxx}\\end{xxx}");
        let subbedAst = processEnvironment(ast, "xxx", { signature: "o m" });
        expect(subbedAst).toEqual(ast);

        ast = latexParser.parse("\\begin{xxx}[a] b c\\end{xxx}");
        subbedAst = processEnvironment(ast, "xxx", { signature: "o m" });
        targetAst = {
            type: "root",
            content: [
                {
                    type: "environment",
                    env: [{ type: "string", content: "xxx" }],
                    content: [
                        { type: "whitespace" },
                        { type: "string", content: "c" },
                    ],
                    args: [
                        {
                            type: "argument",
                            content: [{ type: "string", content: "a" }],
                            openMark: "[",
                            closeMark: "]",
                        },
                        {
                            type: "argument",
                            content: [{ type: "string", content: "b" }],
                            openMark: "{",
                            closeMark: "}",
                        },
                    ],
                },
            ],
        };
        expect(subbedAst).toEqual(targetAst);

        ast = latexParser.parse("\\begin{xxx} [a] b c\\end{xxx}");
        subbedAst = processEnvironment(ast, "xxx", { signature: "o m" });
        expect(subbedAst).toEqual(targetAst);

        ast = latexParser.parse("\\begin{xxx}[a] {b} c\\end{xxx}");
        subbedAst = processEnvironment(ast, "xxx", { signature: "o m" });
        expect(subbedAst).toEqual(targetAst);
    });
});
