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

describe("Lint: Use operator macros in math mode", () => {
    it('can detect naked operators (like "sin")', () => {
        let ast = latexParser.parse("$a sin b$");
        expect(lints.useOperatorMacrosInMathMode.lint(ast)).toHaveLength(1);
        // They are only detected in math mode
        ast = latexParser.parse("a sin b");
        expect(lints.useOperatorMacrosInMathMode.lint(ast)).toHaveLength(0);
        // Operators wrapped in `\operatorname{...}` or `\text{...}` are not detected
        // (as they are regular strings) 
        ast = latexParser.parse("$a \\operatorname{sin} b \\text{sin}$");
        expect(lints.useOperatorMacrosInMathMode.lint(ast)).toHaveLength(0);
    });
    it("can replace naked operators", () => {
        let ast = latexParser.parse("$a sin b$");
        expect(printRaw(lints.useOperatorMacrosInMathMode.fixAll(ast))).toEqual(
            "$a \\sin b$"
        );
        ast = latexParser.parse("$a sin b cos$");
        expect(printRaw(lints.useOperatorMacrosInMathMode.fixAll(ast))).toEqual(
            "$a \\sin b \\cos$"
        );
    });
    it("longer operator names are substituted when needed", () => {
        let ast = latexParser.parse("$a arg min argmin b$");
        expect(printRaw(lints.useOperatorMacrosInMathMode.fixAll(ast))).toEqual(
            "$a \\arg \\min \\argmin b$"
        );
    });
});
