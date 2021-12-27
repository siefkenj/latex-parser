import util from "util";

import * as latexParser from "../parsers/latex-parser";
import * as argspecParser from "../libs/argspec-parser";
import {
    gobbleSingleArgument,
    trimRenderInfo,
    attachMacroArgsInArray,
    attachMacroArgs,
} from "../libs/ast";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("Macro arguments argspec test", () => {
    const SPEC_STRINGS = [
        "",
        "o m",
        "o m o !o m",
        "!o r() m",
        "O{somedefault} m o",
        "m e{^}",
        "m e{_^}",
        "s m",
        "v!",
        "d++ D--{def}",
        "O{nested{defaults}}",
        "m ta o o",
    ];

    for (const spec of SPEC_STRINGS) {
        it(`parses xparse argument specification string "${spec}"`, () => {
            const ast = argspecParser.parse(spec);
            expect(argspecParser.printRaw(ast, true)).toEqual(spec);
        });
    }

    it("gobbleSingleArgument gobbles arguments", () => {
        let ast = [{ type: "whitespace" }, { type: "whitespace" }];
        // Don't match anything if we run out of tokens
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("m")[0])
        ).toMatchObject({
            argument: null,
            rest: ast,
        });
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("o")[0])
        ).toMatchObject({
            argument: null,
            rest: ast,
        });
        // ignores whitespace while consuming
        ast = [
            { type: "whitespace" },
            { type: "string", content: "x" },
            { type: "string", content: "y" },
        ];
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("m")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "x" }],
                openMark: "{",
                closeMark: "}",
            },
            rest: ast.slice(2),
        });
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("o")[0])
        ).toMatchObject({
            argument: null,
            rest: ast,
        });

        // unwraps groups detected as arguments
        ast = [
            { type: "group", content: [{ type: "string", content: "x" }] },
            { type: "string", content: "y" },
        ];
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("m")[0])
        ).toMatchObject({
            argument: {
                type: "argument",
                content: [{ type: "string", content: "x" }],
                openMark: "{",
                closeMark: "}",
            },
            rest: [{ type: "string", content: "y" }],
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
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("o")[0])
        ).toMatchObject({
            argument: {
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
            rest: [{ type: "string", content: "y" }],
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
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("o")[0])
        ).toMatchObject({
            argument: null,
            rest: ast,
        });
        // optional star argument
        ast = [
            { type: "string", content: "*" },
            { type: "string", content: "[" },
            { type: "string", content: "b" },
            { type: "string", content: "]" },
        ];
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("s")[0])
        ).toMatchObject({
            argument: {
                content: [{ type: "string", content: "*" }],
                openMark: "",
                closeMark: "",
            },
            rest: ast.slice(1),
        });
        ast = [
            { type: "whitespace" },
            { type: "string", content: "*" },
            { type: "string", content: "[" },
            { type: "string", content: "b" },
            { type: "string", content: "]" },
        ];
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("s")[0])
        ).toMatchObject({
            argument: {
                content: [{ type: "string", content: "*" }],
                openMark: "",
                closeMark: "",
            },
            rest: ast.slice(2),
        });
        ast = [
            { type: "whitespace" },
            { type: "string", content: "[" },
            { type: "string", content: "b" },
            { type: "string", content: "]" },
        ];
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("s")[0])
        ).toMatchObject({
            argument: null,
            rest: ast,
        });
    });

    it("gobbleSingleArgument gobbles arguments", () => {
        let ast = [{ type: "whitespace" }, { type: "whitespace" }];
        // Don't match anything if we run out of tokens
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("r()")[0])
        ).toMatchObject({
            argument: null,
            rest: ast,
        });
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("d()")[0])
        ).toMatchObject({
            argument: null,
            rest: ast,
        });

        // optional argument
        ast = [
            { type: "whitespace" },
            { type: "string", content: "(" },
            { type: "string", content: "a" },
            { type: "group", content: [{ type: "string", content: "b" }] },
            { type: "string", content: "c" },
            { type: "string", content: ")" },
            { type: "string", content: "y" },
        ];
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("d()")[0])
        ).toMatchObject({
            argument: {
                content: [
                    { type: "string", content: "a" },
                    {
                        type: "group",
                        content: [{ type: "string", content: "b" }],
                    },
                    { type: "string", content: "c" },
                ],
                openMark: "(",
                closeMark: ")",
            },
            rest: [{ type: "string", content: "y" }],
        });

        // optional argument missing closing brace
        ast = [
            { type: "whitespace" },
            { type: "string", content: "(" },
            { type: "string", content: "a" },
            { type: "string", content: "b" },
            { type: "string", content: "c" },
            { type: "string", content: "d" },
            { type: "string", content: "y" },
        ];
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("d()")[0])
        ).toMatchObject({
            argument: null,
            rest: ast,
        });

        // same opening and closing brace
        ast = [
            { type: "whitespace" },
            { type: "string", content: "!" },
            { type: "string", content: "a" },
            { type: "group", content: [{ type: "string", content: "b" }] },
            { type: "string", content: "c" },
            { type: "string", content: "!" },
            { type: "string", content: "y" },
        ];
        expect(
            gobbleSingleArgument(ast, argspecParser.parse("d!!")[0])
        ).toMatchObject({
            argument: {
                content: [
                    { type: "string", content: "a" },
                    {
                        type: "group",
                        content: [{ type: "string", content: "b" }],
                    },
                    { type: "string", content: "c" },
                ],
                openMark: "!",
                closeMark: "!",
            },
            rest: [{ type: "string", content: "y" }],
        });
    });

    it("finds macro arguments", () => {
        // basic capture of arguments
        let ast = trimRenderInfo(latexParser.parse("\\xxx a b c")).content;
        expect(
            attachMacroArgsInArray(ast, { xxx: { signature: "m m" } })
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
        ast = trimRenderInfo(latexParser.parse("\\xxx\\xxx a b c")).content;
        expect(
            attachMacroArgsInArray(ast, { xxx: { signature: "m m" } })
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
        // not enough required arguments still passes. Un-found arguments
        // are replaced with blank arguments
        ast = trimRenderInfo(latexParser.parse("\\xxx   c")).content;
        expect(
            attachMacroArgsInArray(ast, { xxx: { signature: "m m" } })
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
                    {
                        type: "argument",
                        content: [],
                        openMark: "",
                        closeMark: "",
                    },
                ],
            },
        ]);
        // Mixed optional and required arguments
        ast = trimRenderInfo(latexParser.parse("\\xxx   [c] d e f")).content;
        expect(
            attachMacroArgsInArray(ast, { xxx: { signature: "o m o m" } })
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
                        content: [],
                        openMark: "",
                        closeMark: "",
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
        ast = trimRenderInfo(latexParser.parse("\\xxx{c}")).content;
        expect(
            attachMacroArgsInArray(ast, { xxx: { signature: "m" } })
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
        ast = trimRenderInfo(latexParser.parse("\\xxx a b \\xxx{c}")).content;
        expect(
            attachMacroArgsInArray(ast, { xxx: { signature: "m" } })
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
        ast = trimRenderInfo(latexParser.parse("{a\\xxx b}c")).content;
        let subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "m",
            },
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
        subbedAst = attachMacroArgs(subbedAst, {
            xxx: {
                signature: "m",
            },
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
        // Substitute into an environment's body, but not its name (`.env`)
        ast = trimRenderInfo(
            latexParser.parse("\\begin{\\xxx a}b\\xxx c d\\end{\\xxx a}")
        ).content;
        subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "m",
            },
        });
        expect(subbedAst).toEqual([
            {
                type: "environment",
                env: [
                    { type: "macro", content: "xxx" },
                    { type: "whitespace" },
                    { type: "string", content: "a" },
                ],
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
        ast = trimRenderInfo(latexParser.parse("$b\\xxx c$")).content;
        subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "m",
            },
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
        // Don't parse in verbatim environments
        ast = trimRenderInfo(
            latexParser.parse(
                "\\verb|\\xxx a|\\begin{verbatim}\\xxx a\\end{verbatim}"
            )
        ).content;
        subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "m",
            },
        });
        expect(subbedAst).toEqual([
            { type: "verb", env: "verb", escape: "|", content: "\\xxx a" },
            { type: "verbatim", env: "verbatim", content: "\\xxx a" },
        ]);
    });

    it("Doesn't gobble parbreaks or comments", () => {
        let ast, subbedAst;
        // A parbreak interrupts finding an argument
        ast = latexParser.parse("\\xxx\n\ny");
        subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "m",
            },
        });
        expect(subbedAst).toEqual({
            type: "root",
            content: [
                {
                    type: "macro",
                    content: "xxx",
                    args: [
                        {
                            type: "argument",
                            content: [],
                            openMark: "",
                            closeMark: "",
                        },
                    ],
                },
                { type: "parbreak" },
                { type: "string", content: "y" },
            ],
        });
        // A comment interrupts finding an argument
        ast = latexParser.parse("\\xxx %comment\ny");
        subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "m",
            },
        });
        expect(subbedAst).toEqual({
            type: "root",
            content: [
                {
                    type: "macro",
                    content: "xxx",
                    args: [
                        {
                            type: "argument",
                            content: [],
                            openMark: "",
                            closeMark: "",
                        },
                    ],
                },
                {
                    type: "comment",
                    content: "comment",
                    sameline: true,
                    leadingWhitespace: true,
                },
                { type: "string", content: "y" },
            ],
        });
    });

    it("Doesn't gobble arguments twice", () => {
        // Calling `attachMacroArgs` on a macro that already has
        // args, should do nothing (i.e., no eat the next argument.)
        let ast = latexParser.parse("\\xxx a b");
        let subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "m",
            },
        });
        let subbedAst2 = attachMacroArgs(subbedAst, {
            xxx: {
                signature: "m",
            },
        });
        expect(subbedAst).toEqual(subbedAst2);
    });

    it("Optional and mandatory arguments parse with no whitespace", () => {
        // Calling `attachMacroArgs` on a macro that already has
        // args, should do nothing (i.e., no eat the next argument.)
        let ast = latexParser.parse("\\xxx[a]{b}").content;
        let subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "o m",
            },
        });
        expect(subbedAst).toEqual([
            {
                type: "macro",
                content: "xxx",
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
        ]);
    });

    it("Optional arguments may be omitted", () => {
        // Calling `attachMacroArgs` on a macro that already has
        // args, should do nothing (i.e., no eat the next argument.)
        let ast = latexParser.parse("\\xxx a{b}").content;
        let subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "o m",
            },
        });
        expect(subbedAst).toEqual([
            {
                type: "macro",
                content: "xxx",
                args: [
                    {
                        type: "argument",
                        content: [],
                        openMark: "",
                        closeMark: "",
                    },
                    {
                        type: "argument",
                        content: [{ type: "string", content: "a" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                ],
            },
            { type: "group", content: [{ type: "string", content: "b" }] },
        ]);

        ast = latexParser.parse("\\xxx a b").content;
        subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "o m",
            },
        });
        expect(subbedAst).toEqual([
            {
                type: "macro",
                content: "xxx",
                args: [
                    {
                        type: "argument",
                        content: [],
                        openMark: "",
                        closeMark: "",
                    },
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
        ]);

        ast = latexParser.parse("\\xxx a [b]").content;
        subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "m o",
            },
        });
        expect(subbedAst).toEqual([
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
                        openMark: "[",
                        closeMark: "]",
                    },
                ],
            },
        ]);

        ast = latexParser.parse("\\xxx a b").content;
        subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "m o",
            },
        });
        expect(subbedAst).toEqual([
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
                        content: [],
                        openMark: "",
                        closeMark: "",
                    },
                ],
            },
            { type: "whitespace" },
            { type: "string", content: "b" },
        ]);

        ast = latexParser.parse("\\xxx a b").content;
        subbedAst = attachMacroArgs(ast, {
            xxx: {
                signature: "m o m",
            },
        });
        expect(subbedAst).toEqual([
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
                        content: [],
                        openMark: "",
                        closeMark: "",
                    },
                    {
                        type: "argument",
                        content: [{ type: "string", content: "b" }],
                        openMark: "{",
                        closeMark: "}",
                    },
                ],
            },
        ]);
    });
});
