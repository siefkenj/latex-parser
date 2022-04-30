import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../../libs/ast";
import * as Ast from "../../unified-latex-types";
import { processLatexToAstViaUnified } from "../../unified-latex-util-parse";
import {
    attachMacroArgs,
} from "../libs/attach-arguments";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-arguments", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    function strToNodes(str: string) {
        value = str;
        file = processLatexToAstViaUnified().processSync({ value });
        const root = trimRenderInfo(file.result as any) as Ast.Root;
        return root.content;
    }

    it("can attach arguments", () => {
        // Recursively apply substitutions in groups
        let nodes = strToNodes("{a\\xxx b}c");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m",
            },
        });
        expect(nodes).toEqual([
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
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m",
            },
        });
        expect(nodes).toEqual([
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
        nodes = strToNodes("\\begin{\\xxx a}b\\xxx c d\\end{\\xxx a}");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m",
            },
        });
        expect(nodes).toEqual([
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
        nodes = strToNodes("$b\\xxx c$");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m",
            },
        });
        expect(nodes).toEqual([
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
        nodes = strToNodes(
            "\\verb|\\xxx a|\\begin{verbatim}\\xxx a\\end{verbatim}"
        );
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m",
            },
        });
        expect(nodes).toEqual([
            { type: "verb", env: "verb", escape: "|", content: "\\xxx a" },
            { type: "verbatim", env: "verbatim", content: "\\xxx a" },
        ]);
    });

    it("Doesn't gobble parbreaks or comments", () => {
        let nodes, subbedAst;
        // A parbreak interrupts finding an argument
        nodes = strToNodes("\\xxx\n\ny");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m",
            },
        });
        expect(nodes).toEqual([
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
        ]);

        // A comment interrupts finding an argument
        nodes = strToNodes("\\xxx %comment\ny");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m",
            },
        });

        expect(nodes).toEqual([
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
        ]);
    });

    it("Doesn't gobble arguments twice", () => {
        // Calling `attachMacroArgs` on a macro that already has
        // args, should do nothing (i.e., no eat the next argument.)
        let nodes = strToNodes("\\xxx a b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m",
            },
        });
        let nodesClone = JSON.parse(JSON.stringify(nodes));
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m",
            },
        });
        expect(nodes).toEqual(nodesClone);

        nodes = strToNodes("\\xxx[a] b c");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "o m",
            },
        });
        nodesClone = JSON.parse(JSON.stringify(nodes));

        attachMacroArgs(nodes, {
            xxx: {
                signature: "o m",
            },
        });
        expect(nodes).toEqual(nodesClone);
    });

    it("Optional and mandatory arguments parse with no whitespace", () => {
        // Calling `attachMacroArgs` on a macro that already has
        // args, should do nothing (i.e., no eat the next argument.)
        let nodes = strToNodes("\\xxx[a]{b}");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "o m",
            },
        });
        expect(nodes).toEqual([
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
        let nodes = strToNodes("\\xxx a{b}");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "o m",
            },
        });
        expect(nodes).toEqual([
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

        nodes = strToNodes("\\xxx a b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "o m",
            },
        });
        expect(nodes).toEqual([
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

        nodes = strToNodes("\\xxx a [b]");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m o",
            },
        });
        expect(nodes).toEqual([
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

        nodes = strToNodes("\\xxx a b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m o",
            },
        });
        expect(nodes).toEqual([
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

        nodes = strToNodes("\\xxx a b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m o m",
            },
        });
        expect(nodes).toEqual([
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
