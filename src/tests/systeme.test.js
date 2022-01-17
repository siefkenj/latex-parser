import util from "util";

import * as latexParser from "../parsers/latex-parser";
import * as systemeParser from "../libs/systeme/systeme-parser";
import {
    extractVariables,
    systemeContentsToArray,
} from "../libs/systeme/systeme";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

const { printRaw } = latexParser;

describe("XColor tests", () => {
    const SYSTEME_STRINGS = [
        "c",
        "x+y",
        "x+y=3",
        "x=3,-y=9x+y",
        "x@4,2x_{2}=y",
        "foo%comment\nbar,=66,\n%comment\nx",
    ];

    for (const spec of SYSTEME_STRINGS) {
        it(`parses systeme system "${spec}"`, () => {
            let parsedSpec = latexParser.parseMath(spec);
            const ast = systemeParser.parse(parsedSpec);
            expect(systemeParser.printRaw(ast)).toEqual(spec);
        });
    }

    it("extracts variables from systeme body", () => {
        let parsedSpec, ast, vars;
        parsedSpec = latexParser.parseMath("x+y=3");
        ast = systemeParser.parse(parsedSpec);
        vars = extractVariables(ast).map((v) => latexParser.printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y"]));

        parsedSpec = latexParser.parseMath("x+y=3, -y=2");
        ast = systemeParser.parse(parsedSpec);
        vars = extractVariables(ast).map((v) => latexParser.printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y"]));

        parsedSpec = latexParser.parseMath("x+y=3, -y+7z=2");
        ast = systemeParser.parse(parsedSpec);
        vars = extractVariables(ast).map((v) => latexParser.printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y", "z"]));

        parsedSpec = latexParser.parseMath("x+y=3, -y_1+7z=2");
        ast = systemeParser.parse(parsedSpec);
        vars = extractVariables(ast).map((v) => latexParser.printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y", "z", "y_{1}"]));

        parsedSpec = latexParser.parseMath("x+y=3, -y+7z=2 @k +z+l, kz=5");
        ast = systemeParser.parse(parsedSpec);
        vars = extractVariables(ast).map((v) => latexParser.printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y", "z", "k"]));
    });

    it("extracts custom-specified variables from systeme body", () => {
        let parsedSpec, ast, vars;
        parsedSpec = latexParser.parseMath("x+y=3");
        ast = systemeParser.parse(parsedSpec, { whitelistedVariables: ["x"] });
        vars = extractVariables(ast).map((v) => latexParser.printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x"]));

        parsedSpec = latexParser.parseMath("ax+by=3");
        ast = systemeParser.parse(parsedSpec, {
            whitelistedVariables: ["x", "y", "z"],
        });
        vars = extractVariables(ast).map((v) => latexParser.printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["x", "y"]));

        parsedSpec = latexParser.parseMath("-\\alpha+7x\\beta=3");
        ast = systemeParser.parse(parsedSpec, {
            whitelistedVariables: [
                { type: "macro", content: "alpha" },
                { type: "macro", content: "beta" },
            ],
        });
        vars = extractVariables(ast).map((v) => latexParser.printRaw(v));
        expect(new Set(vars)).toEqual(new Set(["\\alpha", "\\beta"]));
    });

    it("can convert systeme contents to array", () => {
        let parsedSpec, ast;
        parsedSpec = latexParser.parseMath("x+y=3,-y-3x+10=7");
        ast = systemeContentsToArray(parsedSpec, { properSpacing: false });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{crcrcrl}&x&+&y&&&=3\\\\-&3x&-&y&+&10&=7\\end{array}"
        );

        // If the leading operations are all +, then there isn't a leading column for operations
        parsedSpec = latexParser.parseMath("x+y=3,-y+3x+10=7");
        ast = systemeContentsToArray(parsedSpec, { properSpacing: false });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{rcrcrl}x&+&y&&&=3\\\\3x&-&y&+&10&=7\\end{array}"
        );

        // If every item on the left has a variable, the extra space for a constant term is removed.
        parsedSpec = latexParser.parseMath("x+y=3,-y+3x=7");
        ast = systemeContentsToArray(parsedSpec, { properSpacing: false });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{rcrl}x&+&y&=3\\\\3x&-&y&=7\\end{array}"
        );

        // Can specify the order of variables.
        parsedSpec = latexParser.parseMath("x+y=3,y+3x=7");
        ast = systemeContentsToArray(parsedSpec, {
            properSpacing: false,
            whitelistedVariables: ["y", "x"],
        });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{rcrl}y&+&x&=3\\\\y&+&3x&=7\\end{array}"
        );

        // A space doesn't count as a variable, even if specified.
        parsedSpec = latexParser.parseMath("x+y=3,y+3x=7");
        ast = systemeContentsToArray(parsedSpec, {
            properSpacing: false,
            whitelistedVariables: ["y", "x", " "],
        });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{rcrl}y&+&x&=3\\\\y&+&3x&=7\\end{array}"
        );

        // Can handle annotations and empty lines
        parsedSpec = latexParser.parseMath("x+y=3@foo,-y+3x=7,,x");
        ast = systemeContentsToArray(parsedSpec, { properSpacing: false });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{rcrll}x&+&y&=3&\\quad foo\\\\3x&-&y&=7&\\\\&&&&\\\\x&&&&\\end{array}"
        );

        // Can parse with zero specified variables
        parsedSpec = latexParser.parseMath("x+y=3,-y+3x=7");
        ast = systemeContentsToArray(parsedSpec, {
            properSpacing: false,
            whitelistedVariables: [],
        });
        expect(printRaw(ast)).toEqual(
            "\\begin{array}{crl}&x+y&=3\\\\-&y+3x&=7\\end{array}"
        );
    });

    it("can preserve systeme delimiters", () => {
        let parsed, ast;
        parsed = latexParser.parse("$\\systeme{x+y=3,-y-3x+10=7}$");
        ast = latexParser.tools.convertToHtml(parsed);
        expect(printRaw(ast)).toEqual(
            "$\\begin{array}{crcrcrl}&x&+&y&&&=3\\\\-&3x&-&y&+&10&=7\\end{array}$"
        );

        parsed = latexParser.parse(
            "$\\sysdelim{\\{}{.}\\systeme{x+y=3,-y-3x+10=7}$"
        );
        ast = latexParser.tools.convertToHtml(parsed);
        expect(printRaw(ast)).toEqual(
            "$\\left\\{\\begin{array}{crcrcrl}&x&+&y&&&=3\\\\-&3x&-&y&+&10&=7\\end{array}\\right.$"
        );
    });
});
