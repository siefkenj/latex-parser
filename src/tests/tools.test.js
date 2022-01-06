import util from "util";
import { tools } from "../parsers/latex-parser";

import * as latexParser from "../parsers/parser";

const { printRaw } = latexParser;
/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("Find macros", () => {
    it("Can find macros", () => {
        let ast = latexParser.parse(
            String.raw`a \macro that appears twice \macro! and $\mathbb R$`
        );
        expect(new Set(tools.allMacros(ast).keys())).toEqual(
            new Set(["macro", "mathbb"])
        );
    });

    it("Can find usepackage imports", () => {
        let ast = latexParser.parse(
            `
\\documentclass[12pt,reqno]{article}

\\usepackage[usenames]{color}
\\usepackage{amssymb, amsmath}
\\usepackage{amsmath}
\\RequirePackage{hyperref}
            `
        );
        expect(tools.getIncludedPackages(ast).map((p) => p.name)).toEqual([
            "hyperref",
            "color",
            "amssymb",
            "amsmath",
            "amsmath",
        ]);
    });

    it("Can replace streaming commands", () => {
        let ast, replaced;
        function replacer(content, originalNode) {
            return {
                ...originalNode,
                content: "REPLACED" + originalNode.content,
                args: [
                    {
                        type: "argument",
                        openMark: "{",
                        closeMark: "}",
                        content,
                    },
                ],
            };
        }
        ast = latexParser.parse(String.raw`a\macro b`).content;
        replaced = tools.replaceStreamingCommand(ast, { macro: replacer });
        expect(printRaw(replaced)).toEqual("a \\REPLACEDmacro{b}");

        ast = latexParser.parse(String.raw`a\mmm b z`).content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("a \\REPLACEDmmm{b z}");

        ast = latexParser.parse("a\\mmm b\n\nz").content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual(
            "a \\REPLACEDmmm{b}\n\n\\REPLACEDmmm{z}"
        );

        ast = latexParser.parse(String.raw`a\mmm b\yyy z`).content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
            yyy: replacer,
        });
        expect(printRaw(replaced)).toEqual(
            "a \\REPLACEDmmm{b \\REPLACEDyyy{z}}"
        );

        ast = latexParser.parse("a\\mmm b\n\n\\yyy7").content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
            yyy: replacer,
        });
        expect(printRaw(replaced)).toEqual(
            "a \\REPLACEDmmm{b}\n\n\\REPLACEDmmm{\\REPLACEDyyy{7}}"
        );
    });

    it("Can remove excess whitespace when replacing streaming commands", () => {
        let ast, replaced;
        function replacer(content, originalNode) {
            return {
                ...originalNode,
                content: "R" + originalNode.content,
                args: [
                    {
                        type: "argument",
                        openMark: "{",
                        closeMark: "}",
                        content,
                    },
                ],
            };
        }
        ast = latexParser.parse("a \\mmm b").content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("a \\Rmmm{b}");

        ast = latexParser.parse("a\n\\mmm b").content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("a \\Rmmm{b}");

        ast = latexParser.parse("a\n%x\n\\mmm b").content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("a\n%x\n\\Rmmm{b}");

        ast = latexParser.parse("a %x\n\\mmm b").content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("a %x\n\\Rmmm{b}");

        ast = latexParser.parse("a \\mmm %x\nb").content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("a %x\n\\Rmmm{b}");

        ast = latexParser.parse("a \\mmm %interesting\n b").content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("a %interesting\n\\Rmmm{b}");

        ast = latexParser.parse("a \\mmm b \\yyy c").content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
            yyy: replacer,
        });
        expect(printRaw(replaced)).toEqual("a \\Rmmm{b \\Ryyy{c}}");

        ast = latexParser.parse("a \\mmm\nb \\yyy c").content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
            yyy: replacer,
        });
        expect(printRaw(replaced)).toEqual("a \\Rmmm{b \\Ryyy{c}}");
    });

    it("Can replace streaming commands in groups", () => {
        let ast, replaced;
        function replacer(content, originalNode) {
            return {
                ...originalNode,
                content: "R" + originalNode.content,
                args: [
                    {
                        type: "argument",
                        openMark: "{",
                        closeMark: "}",
                        content,
                    },
                ],
            };
        }
        ast = latexParser.parse("a {\\mmm b}").content;
        replaced = tools.replaceStreamingCommand(ast[2], {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("\\Rmmm{b}");

        // When a streaming command is hoisted out of a group, whitespace is always trimmed
        ast = latexParser.parse("a{\n\\mmm b}").content;
        replaced = tools.replaceStreamingCommand(ast[1], {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("\\Rmmm{b}");

        ast = latexParser.parse("a\n{%x\n\\mmm b}").content;
        replaced = tools.replaceStreamingCommand(ast[2], {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("%x\n\\Rmmm{b}");

        ast = latexParser.parse("a {\\mmm %x\nb}").content;
        replaced = tools.replaceStreamingCommand(ast[2], {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("%x\n\\Rmmm{b}");
    });

    it("Streaming excess streaming commands are removed at the end of groups/node lists", () => {
        let ast, replaced;
        function replacer(content, originalNode) {
            return {
                ...originalNode,
                content: "R" + originalNode.content,
                args: [
                    {
                        type: "argument",
                        openMark: "{",
                        closeMark: "}",
                        content,
                    },
                ],
            };
        }
        ast = latexParser.parse("a b\\mmm").content;
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("a b");

        ast = latexParser.parse("{b\\mmm}").content[0];
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("{b}");

        ast = latexParser.parse("{b\\mmm }").content[0];
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
        });
        expect(printRaw(replaced)).toEqual("{b}");

        ast = latexParser.parse("{b\\mmm\\yyy}").content[0];
        replaced = tools.replaceStreamingCommand(ast, {
            mmm: replacer,
            yyy: replacer,
        });
        expect(printRaw(replaced)).toEqual("{b}");
    });
});
