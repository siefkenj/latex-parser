import util from "util";

import * as latexParser from "../../parsers/parser";
import { lints } from "../../tools/lint";

const { printRaw } = latexParser;
/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("Lint: Argument font shaping commands", () => {
    it("detects shaping commands", () => {
        let ast = latexParser.parse("a {\\bfseries b}");
        expect(lints.argumentFontShapingCommandsLint.lint(ast)).toHaveLength(1);
        ast = latexParser.parse("a \\textbf{b}");
        expect(lints.argumentFontShapingCommandsLint.lint(ast)).toHaveLength(0);
    });
    it("replaces shaping commands at start of group", () => {
        let ast = latexParser.parse("a {\\bfseries b}");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("a \\textbf{b}");

        ast = latexParser.parse("a {\\bfseries b c d}");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("a \\textbf{b c d}");

        ast = latexParser.parse("a {%important comment\n\\bfseries b c d}");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("a %important comment\n\\textbf{b c d}");
    });
    it("replaces shaping command in the middle of string", () => {
        let ast = latexParser.parse("a \\ttfamily b");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("a \\texttt{b}");

        ast = latexParser.parse("a \\ttfamily b \\sffamily c");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("a \\texttt{b \\textsf{c}}");

        ast = latexParser.parse("\\emph{a \\ttfamily b \\sffamily c}");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("\\emph{a \\texttt{b \\textsf{c}}}");

        ast = latexParser.parse("{a \\ttfamily b \\sffamily c}");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("{a \\texttt{b \\textsf{c}}}");
    });
    it("preserves whitespace when replacing shaping command", () => {
        let ast = latexParser.parse("{a \\ttfamily b }");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("{a \\texttt{b} }");

        ast = latexParser.parse("a\\ttfamily b");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("a \\texttt{b}");
    });
    it("removes shaping commands at the end of a group", () => {
        let ast = latexParser.parse("a {\\bfseries}");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("a ");

        ast = latexParser.parse("a { \\bfseries }");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("a ");

        ast = latexParser.parse("a {b \\bfseries }");
        expect(
            printRaw(lints.argumentFontShapingCommandsLint.fixAll(ast))
        ).toEqual("a {b }");
    });
});
