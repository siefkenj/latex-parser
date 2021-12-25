import util from "util";
import { tools } from "../parsers/latex-parser";

import * as latexParser from "../parsers/parser";

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
            String.raw`
\documentclass[12pt,reqno]{article}

\usepackage[usenames]{color}
\usepackage{amssymb, amsmath}
\usepackage{amsmath}
\RequirePackage{hyperref}
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
