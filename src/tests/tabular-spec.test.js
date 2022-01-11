import util from "util";

import * as latexParser from "../parsers/latex-parser";
import * as tabularParser from "../libs/tabular/tabular-spec-parser";
import { parseTabularSpec } from "../libs/tabular/tabular-spec-parser";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("XColor tests", () => {
    const TABULAR_SPEC_STRINGS = [
        "c",
        "ccc",
        "lrc",
        "|c|c|",
        "||cccc||",
        "|m{5em}|m{1cm}|m{1cm}|",
        "cp{1cm}",
        ">{\\centering}p{3.5cm}>{\\centering}p{3.5cm}",
        "r@{.}l",
        ">{\\bfseries}l",
        "p{1cm}@{foo}m{2cm}!{bar}b{3cm}",
    ];

    for (const spec of TABULAR_SPEC_STRINGS) {
        it(`parses tabular spec string "${spec}"`, () => {
            let parsedSpec = latexParser.parse(spec).content;
            const ast = parseTabularSpec(parsedSpec);
            expect(tabularParser.printRaw(ast)).toEqual(spec);
        });
    }
});
