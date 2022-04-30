import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../../libs/ast";
import * as Ast from "../../unified-latex-types";
import { processLatexToAstViaUnified } from "../../unified-latex-util-parse";
import { processEnvironments } from "../libs/process-environment";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-environments", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    function strToNodes(str: string) {
        value = str;
        file = processLatexToAstViaUnified().processSync({ value });
        const root = trimRenderInfo(file.result as any) as Ast.Root;
        return root.content;
    }

    it("attach one mandatory argument to an environment", () => {
        let targetAst;
        let ast = strToNodes("\\begin{xxx}\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m" } });
        expect(ast).toEqual([
            {
                type: "environment",
                env: [{ type: "string", content: "xxx" }],
                content: [],
                args: [
                    {
                        type: "argument",
                        openMark: "",
                        closeMark: "",
                        content: [],
                    },
                ],
            },
        ]);

        ast = strToNodes("\\begin{xxx}a b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m" } });
        targetAst = [
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
        ];
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx} a b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m" } });
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx}{a} b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m" } });
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx}%\n{a} b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m" } });
        expect(ast).not.toEqual(targetAst);
    });

    it("attach two mandatory argument to an environment", () => {
        let targetAst;
        let ast = strToNodes("\\begin{xxx}\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m m" } });
        expect(ast).toEqual([
            {
                type: "environment",
                env: [{ type: "string", content: "xxx" }],
                content: [],
                args: [
                    {
                        type: "argument",
                        openMark: "",
                        closeMark: "",
                        content: [],
                    },
                    {
                        type: "argument",
                        openMark: "",
                        closeMark: "",
                        content: [],
                    },
                ],
            },
        ]);

        ast = strToNodes("\\begin{xxx}a b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m m" } });
        targetAst = [
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
        ];
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx} a b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m m" } });
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx}{a} b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m m" } });
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx}%\n{a} b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "m m" } });
        expect(ast).not.toEqual(targetAst);
    });

    it("attach optional and mandatory argument to an environment", () => {
        let targetAst;
        let ast = strToNodes("\\begin{xxx}\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "o m" } });
        expect(ast).toEqual([
            {
                type: "environment",
                env: [{ type: "string", content: "xxx" }],
                content: [],
                args: [
                    {
                        type: "argument",
                        openMark: "",
                        closeMark: "",
                        content: [],
                    },
                    {
                        type: "argument",
                        openMark: "",
                        closeMark: "",
                        content: [],
                    },
                ],
            },
        ]);

        ast = strToNodes("\\begin{xxx}[a] b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "o m" } });
        targetAst = [
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
        ];
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx} [a] b c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "o m" } });
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{xxx}[a] {b} c\\end{xxx}");
        processEnvironments(ast, { xxx: { signature: "o m" } });
        expect(ast).toEqual(targetAst);
    });
});
