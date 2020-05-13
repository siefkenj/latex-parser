import util from "util";

import * as latexParser from "../libs/parser";
import * as macroUtils from "../libs/macro-utils";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("AST tests", () => {
    it("splits xparse signatures", () => {
        // whitespace shouldn't matter when parsing
        expect(macroUtils.splitXparseSignature("o m o")).toEqual([
            "o",
            "m",
            "o",
        ]);
        expect(macroUtils.splitXparseSignature("so mo")).toEqual([
            "s",
            "o",
            "m",
            "o",
        ]);
    });

    it("gobbles arguments", () => {
        let ast = [{ type: "whitespace" }, { type: "whitespace" }];
        // Don't match anything if we run out of tokens
        expect(macroUtils.gobbleSingleArgument(ast, "m")).toMatchObject({
            gobbledTokens: 0,
        });
        expect(macroUtils.gobbleSingleArgument(ast, "o")).toMatchObject({
            gobbledTokens: 0,
        });
        // ignores whitespace while consuming
        ast = [
            { type: "whitespace" },
            { type: "string", content: "x" },
            { type: "string", content: "y" },
        ];
        expect(macroUtils.gobbleSingleArgument(ast, "m")).toMatchObject({
            arg: {
                content: [{ type: "string", content: "x" }],
                openMark: "{",
                closeMark: "}",
            },
            gobbledTokens: 2,
        });
        expect(macroUtils.gobbleSingleArgument(ast, "o")).toMatchObject({
            gobbledTokens: 0,
        });
        // unwraps groups detected as arguments
        ast = [
            { type: "group", content: { type: "string", content: "x" } },
            { type: "string", content: "y" },
        ];
        expect(macroUtils.gobbleSingleArgument(ast, "m")).toMatchObject({
            arg: {
                content: [{ type: "string", content: "x" }],
                openMark: "{",
                closeMark: "}",
            },
            gobbledTokens: 1,
        });
        // optional argument
        ast = [
            { type: "whitespace" },
            { type: "string", content: "[" },
            { type: "string", content: "a" },
            { type: "group", content: [{ type: "string", content: "b" }] },
            { type: "string", content: "c" },
            { type: "string", content: "]" },
            { type: "string", content: "y" },
        ];
        expect(macroUtils.gobbleSingleArgument(ast, "o")).toMatchObject({
            arg: {
                content: [
                    { type: "string", content: "a" },
                    {
                        type: "group",
                        content: [{ type: "string", content: "b" }],
                    },
                    { type: "string", content: "c" },
                ],
                openMark: "[",
                closeMark: "]",
            },
            gobbledTokens: 6,
        });
        // optional argument missing closing brace
        ast = [
            { type: "whitespace" },
            { type: "string", content: "[" },
            { type: "string", content: "a" },
            { type: "string", content: "b" },
            { type: "string", content: "c" },
            { type: "string", content: "d" },
            { type: "string", content: "y" },
        ];
        expect(macroUtils.gobbleSingleArgument(ast, "o")).toMatchObject({
            gobbledTokens: 0,
        });
        // optional star argument
        ast = [
            { type: "string", content: "*" },
            { type: "string", content: "[" },
            { type: "string", content: "b" },
            { type: "string", content: "]" },
        ];
        expect(macroUtils.gobbleSingleArgument(ast, "s")).toMatchObject({
            gobbledTokens: 1,
        });
        ast = [
            { type: "whitespace" },
            { type: "string", content: "*" },
            { type: "string", content: "[" },
            { type: "string", content: "b" },
            { type: "string", content: "]" },
        ];
        expect(macroUtils.gobbleSingleArgument(ast, "s")).toMatchObject({
            gobbledTokens: 2,
        });
        ast = [
            { type: "whitespace" },
            { type: "string", content: "[" },
            { type: "string", content: "b" },
            { type: "string", content: "]" },
        ];
        expect(macroUtils.gobbleSingleArgument(ast, "s")).toMatchObject({
            gobbledTokens: 0,
        });
    });
    it("finds macro arguments", () => {
        // basic capture of arguments
        let ast = macroUtils.trimRenderInfo(latexParser.parse("\\xxx a b c"));
        expect(
            macroUtils.attachMacroArgs(ast, "xxx", { signature: "m m" })
        ).toEqual([
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
                    {
                        type: "argument",
                        content: [{ type: "string", content: "b" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                ],
            },
            { type: "whitespace" },
            { type: "string", content: "c" },
        ]);
        // right associativity of arguments (required for things like `\mathbb`)
        ast = macroUtils.trimRenderInfo(latexParser.parse("\\xxx\\xxx a b c"));
        expect(
            macroUtils.attachMacroArgs(ast, "xxx", { signature: "m m" })
        ).toEqual([
            {
                type: "macro",
                content: "xxx",
                args: [
                    {
                        type: "argument",
                        content: [
                            {
                                type: "macro",
                                content: "xxx",
                                args: [
                                    {
                                        type: "argument",
                                        content: [
                                            { type: "string", content: "a" },
                                        ],
                                        openMark: "{",
                                        closeMark: "}",
                                    },
                                    {
                                        type: "argument",
                                        content: [
                                            { type: "string", content: "b" },
                                        ],
                                        openMark: "{",
                                        closeMark: "}",
                                    },
                                ],
                            },
                        ],
                        openMark: "{",
                        closeMark: "}",
                    },
                    {
                        type: "argument",
                        content: [{ type: "string", content: "c" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                ],
            },
        ]);
        // not enough required arguments still passes
        ast = macroUtils.trimRenderInfo(latexParser.parse("\\xxx   c"));
        expect(
            macroUtils.attachMacroArgs(ast, "xxx", { signature: "m m" })
        ).toEqual([
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
        ]);
        // Mixed optional and required arguments
        ast = macroUtils.trimRenderInfo(latexParser.parse("\\xxx   [c] d e f"));
        expect(
            macroUtils.attachMacroArgs(ast, "xxx", { signature: "o m o m" })
        ).toEqual([
            {
                type: "macro",
                content: "xxx",
                args: [
                    {
                        type: "argument",
                        content: [{ type: "string", content: "c" }],
                        openMark: "[",
                        closeMark: "]",
                    },
                    {
                        type: "argument",
                        content: [{ type: "string", content: "d" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                    {
                        type: "argument",
                        content: [{ type: "string", content: "e" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                ],
            },
            { type: "whitespace" },
            { type: "string", content: "f" },
        ]);
        // When given a group argument, extract the group
        ast = macroUtils.trimRenderInfo(latexParser.parse("\\xxx{c}"));
        expect(
            macroUtils.attachMacroArgs(ast, "xxx", { signature: "m" })
        ).toEqual([
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
        ]);
        // Find multiple occurrences
        ast = macroUtils.trimRenderInfo(
            latexParser.parse("\\xxx a b \\xxx{c}")
        );
        expect(
            macroUtils.attachMacroArgs(ast, "xxx", { signature: "m" })
        ).toEqual([
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
            { type: "whitespace" },
            { type: "string", content: "b" },
            { type: "whitespace" },
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
        ]);
        // Recursively apply substitutions in groups
        ast = macroUtils.trimRenderInfo(latexParser.parse("{a\\xxx b}c"));
        let subbedAst = macroUtils.attachMacroArgs(ast, "xxx", {
            signature: "m",
        });
        expect(subbedAst).toEqual([
            {
                type: "group",
                content: [
                    { type: "string", content: "a" },
                    {
                        type: "macro",
                        content: "xxx",
                        args: [
                            {
                                type: "argument",
                                content: [{ type: "string", content: "b" }],
                                openMark: "{",
                                closeMark: "}",
                            },
                        ],
                    },
                ],
            },
            { type: "string", content: "c" },
        ]);
        // Substitution should be idempotent
        subbedAst = macroUtils.attachMacroArgs(subbedAst, "xxx", {
            signature: "m",
        });
        expect(subbedAst).toEqual([
            {
                type: "group",
                content: [
                    { type: "string", content: "a" },
                    {
                        type: "macro",
                        content: "xxx",
                        args: [
                            {
                                type: "argument",
                                content: [{ type: "string", content: "b" }],
                                openMark: "{",
                                closeMark: "}",
                            },
                        ],
                    },
                ],
            },
            { type: "string", content: "c" },
        ]);
        // Substitute into an environment's args and body, but not its name (`.env`)
        ast = macroUtils.trimRenderInfo(
            latexParser.parse(
                "\\begin{\\xxx a}[\\xxx a]b\\xxx c d\\end{\\xxx a}"
            )
        );
        subbedAst = macroUtils.attachMacroArgs(ast, "xxx", {
            signature: "m",
        });
        expect(subbedAst).toEqual([
            {
                type: "environment",
                env: [
                    { type: "macro", content: "xxx" },
                    { type: "whitespace" },
                    { type: "string", content: "a" },
                ],
                args: {
                    type: "argument",
                    content: [
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
                    ],
                    openMark: "[",
                    closeMark: "]",
                },
                content: [
                    { type: "string", content: "b" },
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
                    { type: "whitespace" },
                    { type: "string", content: "d" },
                ],
            },
        ]);
        // Parse in math environment
        ast = macroUtils.trimRenderInfo(latexParser.parse("$b\\xxx c$"));
        subbedAst = macroUtils.attachMacroArgs(ast, "xxx", {
            signature: "m",
        });
        expect(subbedAst).toEqual([
            {
                type: "inlinemath",
                content: [
                    { type: "string", content: "b" },
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
            },
        ]);
        // Parse in math environment
        ast = macroUtils.trimRenderInfo(
            latexParser.parse(
                "\\verb|\\xxx a|\\begin{verbatim}\\xxx a\\end{verbatim}"
            )
        );
        subbedAst = macroUtils.attachMacroArgs(ast, "xxx", {
            signature: "m",
        });
        expect(subbedAst).toEqual([
            { type: "verb", env: "verb", escape: "|", content: "\\xxx a" },
            { type: "verbatim", env: "verbatim", content: "\\xxx a" },
        ]);
    });

    it("Doesn't gobble parbreaks or comments", () => {
        // A comment interrupts finding an argument
        let ast = latexParser.parse("\\xxx %comment\ny");
        let subbedAst = macroUtils.attachMacroArgs(ast, "xxx", {
            signature: "m",
        });
        expect(subbedAst).toEqual(ast);

        // A parbreak interrupts finding an argument
        ast = latexParser.parse("\\xxx\n\ny");
        subbedAst = macroUtils.attachMacroArgs(ast, "xxx", {
            signature: "m",
        });
        expect(subbedAst).toEqual(ast);
    });

    it("Doesn't gobble arguments twice", () => {
        // Calling `attachMacroArgs` on a macro that already has
        // args, should do nothing (i.e., no eat the next argument.)
        let ast = latexParser.parse("\\xxx a b");
        let subbedAst = macroUtils.attachMacroArgs(ast, "xxx", {
            signature: "m",
        });
        let subbedAst2 = macroUtils.attachMacroArgs(subbedAst, "xxx", {
            signature: "m",
        });
        expect(subbedAst).toEqual(subbedAst2);
    });

    it("trims whitespace/parbreaks", () => {
        const targetAst = macroUtils.trimRenderInfo(latexParser.parse("a b c"));

        // trim left
        let ast = macroUtils.trimRenderInfo(latexParser.parse(" a b c"));
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        // trim right
        ast = macroUtils.trimRenderInfo(latexParser.parse("a b c "));
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        // trim parbreak
        ast = macroUtils.trimRenderInfo(latexParser.parse("\n\n\na b c "));
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        // trim left and right
        ast = macroUtils.trimRenderInfo(latexParser.parse("\n\n\na b c\n\n "));
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        // trim everything when there is only whitespace
        ast = macroUtils.trimRenderInfo(latexParser.parse("\n \n\n "));
        expect(macroUtils.trim(ast)).toEqual([]);
    });

    it("trims whitespace/parbreaks in math environments", () => {
        // Display math
        let targetAst = macroUtils.trimRenderInfo(latexParser.parse("\\[\\]"));

        let ast = macroUtils.trimRenderInfo(latexParser.parse("\\[ \\]"));
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        ast = macroUtils.trimRenderInfo(latexParser.parse("\\[\n\\]"));
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        // Inline math
        ast = macroUtils.trimRenderInfo(latexParser.parse("$ $"));
        expect(macroUtils.trim(ast)).toEqual([
            { type: "inlinemath", content: [] },
        ]);

        ast = macroUtils.trimRenderInfo(latexParser.parse("$\n$"));
        expect(macroUtils.trim(ast)).toEqual([
            { type: "inlinemath", content: [] },
        ]);

        // Environments
        targetAst = macroUtils.trimRenderInfo(
            latexParser.parse("\\begin{equation}\\end{equation}")
        );

        ast = macroUtils.trimRenderInfo(
            latexParser.parse("\\begin{equation} \\end{equation}")
        );
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        ast = macroUtils.trimRenderInfo(
            latexParser.parse("\\begin{equation}\n \\end{equation}")
        );
        expect(macroUtils.trim(ast)).toEqual(targetAst);
    });

    it("Splits and unsplits based on a macro", () => {
        // basic splitting
        let ast = macroUtils.trimRenderInfo(
            latexParser.parse("a\\xxx b c\\xxx x y z")
        );
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
        ast = macroUtils.trimRenderInfo(
            latexParser.parse("\\xxx b c\\xxx x y z")
        );
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
        ast = macroUtils.trimRenderInfo(latexParser.parse("\\xxx"));
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
        ast = macroUtils.trimRenderInfo(latexParser.parse("a b c"));
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
        ast = macroUtils.attachMacroArgs(
            macroUtils.trimRenderInfo(latexParser.parse("\\xxx a b \\xxx c d")),
            "xxx",
            { signature: "m" }
        );
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
            const ast = latexParser.parse(str);
            const split = macroUtils.splitOnMacro(ast);
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
            const ast = latexParser.parse(inStr);
            expect(
                latexParser.printRaw(macroUtils.cleanEnumerateBody(ast))
            ).toEqual(outStr);
        }

        // subs for a different macro
        const [inStr, outStr] = [
            "\\item4 x \\xxx yo there\\xxx\n\ngood ",
            "\\item4 x\n\n\\xxx yo there\n\n\\xxx good",
        ];
        let ast = macroUtils.trimRenderInfo(latexParser.parse(inStr));
        expect(
            latexParser.printRaw(macroUtils.cleanEnumerateBody(ast, "xxx"))
        ).toEqual(outStr);
    });

    it("Splits tabular body", () => {
        let ast = latexParser.parse("a&2\\\\[4pt]3&4");

        expect(macroUtils.splitTabular(macroUtils.trimRenderInfo(ast))).toEqual(
            {
                rows: [
                    {
                        cells: [
                            [
                                {
                                    type: "string",
                                    content: "a",
                                },
                            ],
                            [{ type: "string", content: "2" }],
                        ],
                        seps: [{ type: "string", content: "&" }],
                    },
                    {
                        cells: [
                            [{ type: "string", content: "3" }],
                            [
                                {
                                    type: "string",
                                    content: "4",
                                },
                            ],
                        ],
                        seps: [{ type: "string", content: "&" }],
                    },
                ],
                rowSeps: [
                    {
                        type: "macro",
                        content: "\\",
                        args: [
                            {
                                type: "argument",
                                content: [
                                    {
                                        type: "string",
                                        content: "4pt",
                                    },
                                ],
                                openMark: "[",
                                closeMark: "]",
                            },
                        ],
                    },
                ],
            }
        );
    });
});
