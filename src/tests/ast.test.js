import util from "util";

import * as latexParser from "../parsers/parser";
import * as macroUtils from "../libs/macro-utils";
import {
    attachMacroArgs,
    replaceNode,
    trimRenderInfo,
    match,
} from "../libs/ast";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("AST tests", () => {
    it("trims whitespace/parbreaks", () => {
        const targetAst = trimRenderInfo(latexParser.parse("a b c")).content;

        // trim left
        let ast = trimRenderInfo(latexParser.parse(" a b c")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        // trim right
        ast = trimRenderInfo(latexParser.parse("a b c ")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        // trim parbreak
        ast = trimRenderInfo(latexParser.parse("\n\n\na b c ")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        // trim left and right
        ast = trimRenderInfo(latexParser.parse("\n\n\na b c\n\n ")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        // trim everything when there is only whitespace
        ast = trimRenderInfo(latexParser.parse("\n \n\n ")).content;
        expect(macroUtils.trim(ast)).toEqual([]);
    });

    it("trims whitespace/parbreaks in math environments", () => {
        // Display math
        let targetAst = trimRenderInfo(latexParser.parse("\\[\\]").content);

        let ast = trimRenderInfo(latexParser.parse("\\[ \\]")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        ast = trimRenderInfo(latexParser.parse("\\[\n\\]")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        // Inline math
        ast = trimRenderInfo(latexParser.parse("$ $")).content;
        expect(macroUtils.trim(ast)).toEqual([
            { type: "inlinemath", content: [] },
        ]);

        ast = trimRenderInfo(latexParser.parse("$\n$")).content;
        expect(macroUtils.trim(ast)).toEqual([
            { type: "inlinemath", content: [] },
        ]);

        // Environments
        targetAst = trimRenderInfo(
            latexParser.parse("\\begin{equation}\\end{equation}")
        ).content;

        ast = trimRenderInfo(
            latexParser.parse("\\begin{equation} \\end{equation}")
        ).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        ast = trimRenderInfo(
            latexParser.parse("\\begin{equation}\n \\end{equation}")
        ).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);
    });

    it("Splits and unsplits based on a macro", () => {
        // basic splitting
        let ast = trimRenderInfo(
            latexParser.parse("a\\xxx b c\\xxx x y z")
        ).content;
        expect(macroUtils.splitOnMacro(ast, "xxx")).toEqual({
            segments: [
                [
                    {
                        type: "string",
                        content: "a",
                    },
                ],
                [
                    { type: "whitespace" },
                    { type: "string", content: "b" },
                    { type: "whitespace" },
                    { type: "string", content: "c" },
                ],
                [
                    { type: "whitespace" },
                    { type: "string", content: "x" },
                    { type: "whitespace" },
                    { type: "string", content: "y" },
                    { type: "whitespace" },
                    {
                        type: "string",
                        content: "z",
                    },
                ],
            ],
            macros: [
                { type: "macro", content: "xxx" },
                { type: "macro", content: "xxx" },
            ],
        });

        // macro at start
        ast = trimRenderInfo(latexParser.parse("\\xxx b c\\xxx x y z")).content;
        expect(macroUtils.splitOnMacro(ast, "xxx")).toEqual({
            segments: [
                [],
                [
                    { type: "whitespace" },
                    { type: "string", content: "b" },
                    { type: "whitespace" },
                    { type: "string", content: "c" },
                ],
                [
                    { type: "whitespace" },
                    { type: "string", content: "x" },
                    { type: "whitespace" },
                    { type: "string", content: "y" },
                    { type: "whitespace" },
                    {
                        type: "string",
                        content: "z",
                    },
                ],
            ],
            macros: [
                {
                    type: "macro",
                    content: "xxx",
                },
                { type: "macro", content: "xxx" },
            ],
        });

        // only macro
        ast = trimRenderInfo(latexParser.parse("\\xxx")).content;
        expect(macroUtils.splitOnMacro(ast, "xxx")).toEqual({
            segments: [[], []],
            macros: [
                {
                    type: "macro",
                    content: "xxx",
                },
            ],
        });

        // empty ast
        ast = [];
        expect(macroUtils.splitOnMacro(ast, "xxx")).toEqual({
            segments: [[]],
            macros: [],
        });

        // no macro
        ast = trimRenderInfo(latexParser.parse("a b c")).content;
        expect(macroUtils.splitOnMacro(ast, "xxx")).toEqual({
            segments: [
                [
                    {
                        type: "string",
                        content: "a",
                    },
                    { type: "whitespace" },
                    { type: "string", content: "b" },
                    { type: "whitespace" },
                    {
                        type: "string",
                        content: "c",
                    },
                ],
            ],
            macros: [],
        });

        // preserve macro args
        ast = attachMacroArgs(
            trimRenderInfo(latexParser.parse("\\xxx a b \\xxx c d")),
            { xxx: { signature: "m" } }
        ).content;
        expect(macroUtils.splitOnMacro(ast, "xxx")).toEqual({
            segments: [
                [],
                [
                    { type: "whitespace" },
                    { type: "string", content: "b" },
                    { type: "whitespace" },
                ],
                [
                    { type: "whitespace" },
                    {
                        type: "string",
                        content: "d",
                    },
                ],
            ],
            macros: [
                {
                    type: "macro",
                    content: "xxx",
                    args: [
                        {
                            type: "argument",
                            content: [{ type: "string", content: "a" }],
                            openMark: "{",
                            closeMark: "}",
                        },
                    ],
                },
                {
                    type: "macro",
                    content: "xxx",
                    args: [
                        {
                            type: "argument",
                            content: [{ type: "string", content: "c" }],
                            openMark: "{",
                            closeMark: "}",
                        },
                    ],
                },
            ],
        });

        // Splitting and unsplitting should be the identity map
        for (const str of [
            "\\xxx a b \\xxx c d",
            "x y\\xxx a b \\xxx c d",
            "",
            "\\xxx",
            "a b c",
        ]) {
            const ast = latexParser.parse(str).content;
            const split = macroUtils.splitOnMacro(ast, "xxx");
            expect(macroUtils.unsplitOnMacro(split)).toEqual(ast);
        }
    });

    it("Cleans an enumerate body", () => {
        const STRINGS = [
            [" abc ", "abc"],
            [" \\item   xxx", "\\item xxx"],
            ["\\item45\\item hey there", "\\item 45\n\n\\item hey there"],
            ["good  \\item stuff\\item ", "good\n\n\\item stuff\n\n\\item"],
            [
                "good  \\item [xxx]stuff\\item ",
                "good\n\n\\item[xxx] stuff\n\n\\item",
            ],
        ];
        for (const [inStr, outStr] of STRINGS) {
            const ast = latexParser.parse(inStr).content;
            expect(
                latexParser.printRaw(macroUtils.cleanEnumerateBody(ast))
            ).toEqual(outStr);
        }

        // subs for a different macro
        const [inStr, outStr] = [
            "\\item4 x \\xxx yo there\\xxx\n\ngood ",
            "\\item4 x\n\n\\xxx yo there\n\n\\xxx good",
        ];
        let ast = trimRenderInfo(latexParser.parse(inStr)).content;
        expect(
            latexParser.printRaw(macroUtils.cleanEnumerateBody(ast, "xxx"))
        ).toEqual(outStr);
    });

    it("merges whitespace and parbreaks", () => {
        // wrap the parbreak in a group so that it doesn't get trimmed by the parser
        let targetAst = trimRenderInfo(latexParser.parse("{\n\n}")).content;

        let ast = trimRenderInfo(latexParser.parse("{\n}")).content;
        expect(macroUtils.trim(ast)).not.toEqual(targetAst);

        ast = trimRenderInfo(latexParser.parse("{\n\n\n}")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        ast = trimRenderInfo(latexParser.parse("{\n\n \n}")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        ast = trimRenderInfo(latexParser.parse("{\n\n \n\n}")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);
    });

    it("Can replace macros", () => {
        let targetAst = trimRenderInfo(
            latexParser.parse("\\foo and \\bar")
        ).content;
        let insertNode = trimRenderInfo(latexParser.parse("\\bar")).content;
        let ast = trimRenderInfo(latexParser.parse("\\foo and \\raw")).content;

        ast = replaceNode(
            ast,
            () => insertNode,
            (node) => match.macro(node, "raw")
        );
        expect(macroUtils.trim(ast)).toEqual(targetAst);
    });
});
