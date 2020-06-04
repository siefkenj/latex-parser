import util from "util";

import * as latexParser from "../parsers/parser";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("Basic parse", () => {
    it("Parses empty string", () => {
        latexParser.parse("");
    });

    it("Parses inline math", () => {
        latexParser.parse("$x^2$");
    });

    it("Parses displaystyle math", () => {
        latexParser.parse(String.raw`\[x^2\]`);
    });

    it("Parses text", () => {
        latexParser.parse("hi, I am text");
    });
});

describe("Basic ast", () => {
    it("Renders flat strings correctly", () => {
        const FLAT_STRINGS = [
            String.raw`"some words with spaces"`,
            String.raw`$a math equation$`,
            String.raw`$x^{2}$`,
            String.raw`{a group { of text}}`,
            String.raw`\begin{env}text\end{env}`,
            String.raw`\begin{strange*\yy}a strange environment\end{strange*\yy}`,
            String.raw`\hi 22, I am te$xt$\begin{abc}[1,2]xx\end{abc}`,
            "a comment % at the end\nof a line",
            "a comment %    with    extra    spaces",
            "a comment\n% at a new position\non the next line",
            "a comment % at a new position\n\nwith a parbreak",
            String.raw`\verb|$|`,
            String.raw`\verb*|$|`,
            String.raw`\begin{verbatim}$\end{verbatim}`,
            String.raw`\begin{verbatim*}$\end{verbatim*}`,
            String.raw`\begin{comment}$\end{comment}`,
        ];
        for (const str of FLAT_STRINGS) {
            expect(latexParser.printRaw(latexParser.parse(str))).toMatch(str);
        }
        const STRINGS_WITH_EXCESS_SPACE = [
            [
                String.raw`"some    words with spaces"`,
                String.raw`"some words with spaces"`,
            ],
            [
                "some    \n\n           words with spaces",
                "some\n\nwords with spaces",
            ],
            [
                "spaces at the start%\n    of a newline are ignored",
                "spaces at the start%\nof a newline are ignored",
            ],
            [
                "a comment \n% at a new position\non the next line",
                "a comment\n% at a new position\non the next line",
            ],
        ];

        for (const [inStr, outStr] of STRINGS_WITH_EXCESS_SPACE) {
            expect(latexParser.printRaw(latexParser.parse(inStr))).toMatch(
                outStr
            );
        }
    });

    it("Puts braces around arguments", () => {
        const parsed = latexParser.parse("\\mathbb X");
        expect(latexParser.printRaw(parsed)).toEqual("\\mathbb{X}");
    });

    it("Parses unbalanced groups/unbalanced math", () => {
        let parsed = latexParser.parse("{");
        expect(latexParser.printRaw(parsed)).toEqual("{");

        parsed = latexParser.parse("}");
        expect(latexParser.printRaw(parsed)).toEqual("}");

        parsed = latexParser.parse("$$");
        expect(latexParser.printRaw(parsed)).toEqual("$$");

        parsed = latexParser.parse("$$$");
        expect(latexParser.printRaw(parsed)).toEqual("$$$");

        parsed = latexParser.parse("$$x$");
        expect(latexParser.printRaw(parsed)).toEqual("$$x$");

        parsed = latexParser.parse("{{{}{}}{}{{{}");
        expect(latexParser.printRaw(parsed)).toEqual("{{{}{}}{}{{{}");
    });
});
