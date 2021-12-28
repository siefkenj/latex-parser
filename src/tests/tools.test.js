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
});

describe("HTML Generation", () => {
    it("Can generate html-like tags", () => {
        let content = latexParser.parse("$x^{2}$").content;

        let tag = tools.tagLikeMacro({ tag: "foo" });
        expect(printRaw(tag)).toEqual("<foo />");

        tag = tools.tagLikeMacro({ tag: "foo", content });
        expect(printRaw(tag)).toEqual("<foo>$x^{2}$</foo>");

        tag = tools.tagLikeMacro({
            tag: "foo",
            content,
            attributes: { attr1: "val1", attr2: "val2" },
        });
        expect(printRaw(tag)).toEqual(
            '<foo attr1="val1" attr2="val2">$x^{2}$</foo>'
        );

        tag = tools.tagLikeMacro({
            tag: "foo",
            attributes: { attr1: "val1", attr2: "val2" },
        });
        expect(printRaw(tag)).toEqual('<foo attr1="val1" attr2="val2" />');
    });
});
