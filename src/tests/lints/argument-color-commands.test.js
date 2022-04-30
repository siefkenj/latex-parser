import util from "util";

import * as latexParser from "../../unified-latex/unified-latex-util-parse";
import { printRaw } from "../../unified-latex/unified-latex-util-print-raw";
import { lints } from "../../tools/lint";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

const doLint = lints.argumentColorCommandsLint.lint;
const doFix = lints.argumentColorCommandsLint.fixAll;

describe("Lint: Argument color commands", () => {
    it("detects color commands", () => {
        let ast = latexParser.parse("a {\\color{blue} b}");
        expect(doLint(ast)).toHaveLength(1);
        ast = latexParser.parse("a \\textcolor{blue}{b}");
        expect(doLint(ast)).toHaveLength(0);
    });
    it("replaces color commands at start of group", () => {
        let ast = latexParser.parse("a {\\color{blue} b}");
        expect(printRaw(doFix(ast))).toEqual("a \\textcolor{blue}{b}");

        ast = latexParser.parse("a {\\color{blue} b c d}");
        expect(printRaw(doFix(ast))).toEqual("a \\textcolor{blue}{b c d}");

        ast = latexParser.parse("a {%important comment\n\\color{blue} b c d}");
        expect(printRaw(doFix(ast))).toEqual(
            "a %important comment\n\\textcolor{blue}{b c d}"
        );
    });
    it("preserves color's optional args", () => {
        let ast = latexParser.parse("a {\\color[rgb]{blue} b}");
        expect(printRaw(doFix(ast))).toEqual("a \\textcolor[rgb]{blue}{b}");
    });
    it("replaces color command in the middle of string", () => {
        let ast = latexParser.parse("a \\color{blue} b");
        expect(printRaw(doFix(ast))).toEqual("a \\textcolor{blue}{b}");

        ast = latexParser.parse("a \\color{blue} b \\color{red} c");
        expect(printRaw(doFix(ast))).toEqual(
            "a \\textcolor{blue}{b \\textcolor{red}{c}}"
        );

        ast = latexParser.parse("\\emph{a \\color{blue} b \\color{red} c}");
        expect(printRaw(doFix(ast))).toEqual(
            "\\emph{a \\textcolor{blue}{b \\textcolor{red}{c}}}"
        );
    });
    it("preserves whitespace when replacing color command", () => {
        let ast = latexParser.parse("{a \\color{blue} b }");
        expect(printRaw(doFix(ast))).toEqual("{a \\textcolor{blue}{b} }");

        ast = latexParser.parse("a\\color{red} b");
        expect(printRaw(doFix(ast))).toEqual("a \\textcolor{red}{b}");
    });
    it("removes color commands at the end of a group", () => {
        let ast = latexParser.parse("a {\\color{blue}}");
        expect(printRaw(doFix(ast))).toEqual("a ");

        ast = latexParser.parse("a { \\color{blue} }");
        expect(printRaw(doFix(ast))).toEqual("a ");

        ast = latexParser.parse("a {b \\color{blue} }");
        expect(printRaw(doFix(ast))).toEqual("a {b }");
    });
    it("does not replace color commands if they affect a parbreak", () => {
        let ast = latexParser.parse("a \\color{blue}\n\nb");
        expect(printRaw(doFix(ast))).toEqual("a \\color{blue}\n\nb");

        ast = latexParser.parse("a {\\color{blue} x\n\nb}");
        expect(printRaw(doFix(ast))).toEqual("a {\\color{blue} x\n\nb}");
    });
});
