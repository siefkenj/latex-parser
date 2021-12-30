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

describe("Lint: TeX font shaping commands", () => {
    it("can detect shaping commands", () => {
        let ast = latexParser.parse("a \\bf b");
        expect(lints.texFontShapingCommandsLint.lint(ast)).toHaveLength(1);
        ast = latexParser.parse("a \\bfseries b");
        expect(lints.texFontShapingCommandsLint.lint(ast)).toHaveLength(0);
    });
    it("can replace shaping commands", () => {
        let ast = latexParser.parse("a \\bf b");
        expect(printRaw(lints.texFontShapingCommandsLint.fixAll(ast))).toEqual(
            "a \\bfseries b"
        );

        ast = latexParser.parse("a \\tt b");
        expect(printRaw(lints.texFontShapingCommandsLint.fixAll(ast))).toEqual(
            "a \\ttfamily b"
        );
    });
});
