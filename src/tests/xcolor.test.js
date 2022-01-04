import util from "util";

import * as latexParser from "../parsers/latex-parser";
import * as xcolorParser from "../libs/xcolor/xcolor-parser";
import { computeColor } from "../libs/xcolor/xcolor";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("XColor tests", () => {
    const COLOR_SPEC_STRINGS = [
        "red",
        "-red",
        "--red!50!green!12.345",
        "red!50!green!20!blue",
        "foo!!+",
        "foo!![7]",
        "foo!25!red!!+++",
        "foo!25!red!70!green!![7]",
        "rgb:red,1",
        "rgb,10:red,1",
        "cmyk:red,1;-green!25!blue!60,11.25;blue,-2",
        "rgb,10:red,1>wheel,30",
        "red>twheel,1,12",
        "cmyk:red,1;-green!25!blue!60,11.25;blue,-2>twheel,-11,12",
    ];

    for (const spec of COLOR_SPEC_STRINGS) {
        it(`parses xcolor color specification string "${spec}"`, () => {
            const ast = xcolorParser.parse(spec);
            expect(ast.type).toEqual("color");
            expect(xcolorParser.printRaw(ast, true)).toEqual(spec);
        });
    }

    it("Can mix colors", () => {
        let colorAst = xcolorParser.parse("red");
        let color = computeColor(colorAst);
        expect(color.hex()).toEqual("#FF0000");

        colorAst = xcolorParser.parse("red!50!black");
        color = computeColor(colorAst);
        expect(color.hex()).toEqual("#800000");

        colorAst = xcolorParser.parse("red!25!black");
        color = computeColor(colorAst);
        expect(color.hex()).toEqual("#400000");

        colorAst = xcolorParser.parse("-red!25!black");
        color = computeColor(colorAst);
        expect(color.hex()).toEqual("#004040");

        colorAst = xcolorParser.parse("red!50!black!50!white");
        color = computeColor(colorAst);
        expect(color.hex()).toEqual("#BF8080");

        colorAst = xcolorParser.parse("red!50!black!50");
        color = computeColor(colorAst);
        expect(color.hex()).toEqual("#BF8080");

        // ExtExpr color mixing
        colorAst = xcolorParser.parse("rgb:red,4;green,2;yellow,1");
        color = computeColor(colorAst);
        expect(color.hex()).toEqual("#B66D00");

        colorAst = xcolorParser.parse("rgb:red,4;green,2;yellow,-1");
        color = computeColor(colorAst);
        expect(color.hex()).toEqual("#993300");

        colorAst = xcolorParser.parse("rgb,9:red,4;green,2;yellow,1");
        color = computeColor(colorAst);
        expect(color.hex()).toEqual("#8E5500");
    });
    it("Can apply color functions", () => {
        let colorAst = xcolorParser.parse("yellow>wheel,1,2");
        let color = computeColor(colorAst);
        expect(color.hex()).toEqual("#0000FF");

        colorAst = xcolorParser.parse("yellow>twheel,1,2");
        color = computeColor(colorAst);
        expect(color.hex()).toEqual("#FF00FF");

        colorAst = xcolorParser.parse("yellow>wheel,1,3");
        color = computeColor(colorAst);
        expect(color.hex()).toEqual("#00FFFF");

        colorAst = xcolorParser.parse("yellow>wheel,60");
        color = computeColor(colorAst);
        expect(color.hex()).toEqual("#00FF00");
    });
});
