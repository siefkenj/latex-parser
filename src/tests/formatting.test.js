import Prettier from "prettier/standalone";
import { origLog } from "./parser.test";

import * as latexParser from "../latex-parser";
import * as prettierPluginLatex from "../prettier-plugin-latex";

expect.extend({
    toFormatAs(inStr, outStr, formatter) {
        if (typeof formatter !== "function") {
            throw new Error(
                "Must pass in a formatting function as the second argument when using `toFormatAs`"
            );
        }
        const formatted = formatter(inStr);

        const pass = this.equals(formatted, outStr);

        return {
            pass,
            message: () =>
                `When formatting\n\n${this.utils.EXPECTED_COLOR(
                    inStr
                )}\n\nthe output did ${
                    pass ? "" : "not"
                } format correctly\n\n${this.utils.printDiffOrStringify(
                    outStr,
                    formatted,
                    "Expected",
                    "Received"
                )}`,
        };
    },
});

/* eslint-env jest */

describe("Prettier tests", () => {
    it("prints latex code", () => {
        const STRINGS = [
            { inStr: "$x^{21}$", outStr: "$x^{21}$" },
            {
                inStr: "\\begin{enumerate}\\item a b c\\item\\end{enumerate}",
                outStr:
                    "\\begin{enumerate}\n\t\\item a b c\n\n\t\\item\n\\end{enumerate}",
            },
            {
                inStr:
                    "\\documentclass[foo]{bar} a b c\n" +
                    "\n" +
                    "\\begin{enumerate}  \\item hi there this \\emph{is stuff $\\mathbb 4somegoodstuff$ is really, really great!}\\item and other stuff\\end{enumerate}\n",
                outStr:
                    "\\documentclass[foo]{bar}\n" +
                    "a\n" +
                    "b\n" +
                    "c\n" +
                    "\n" +
                    "\\begin{enumerate}\n" +
                    "\t\\item hi there this \\emph{is\n" +
                    "\t\tstuff $\\mathbb{4}somegoods\n" +
                    "\t\ttuff$ is really, really\n" +
                    "\t\tgreat!}\n" +
                    "\n" +
                    "\t\\item and other stuff\n" +
                    "\\end{enumerate}",
            },
            {
                inStr: "\\begin{xx}\\begin{yy}x\\end{yy}\\end{xx}",
                outStr:
                    "\\begin{xx}\n\t\\begin{yy}\n\t\tx\n\t\\end{yy}\n\\end{xx}",
            },
            { inStr: "\\begin{xx}\\end{xx}", outStr: "\\begin{xx}\n\\end{xx}" },
        ];

        const formatter = (x) =>
            Prettier.format(x, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("prints comments", () => {
        const STRINGS = [
            { inStr: "%", outStr: "%" },
            { inStr: "x%", outStr: "x%" },
            { inStr: "x %", outStr: "x %" },
            { inStr: "x % abc", outStr: "x % abc" },
            { inStr: "x % abc\ny", outStr: "x % abc\ny" },
            { inStr: "x % abc\n\ny", outStr: "x % abc\n\ny" },
            { inStr: "x % abc\n\n", outStr: "x % abc" },
            { inStr: "x\n%\n\ny", outStr: "x\n%\n\ny" },
            {
                inStr: "\\begin{a}\n%\n\\end{a}",
                outStr: "\\begin{a}\n\t%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}x%\n\\end{a}",
                outStr: "\\begin{a}\n\tx%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}x%\n\n\\end{a}",
                outStr: "\\begin{a}\n\tx%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}%\n\n\\end{a}",
                outStr: "\\begin{a}%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\n%\n\n\\end{a}",
                outStr: "\\begin{a}\n\t%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\n\n%\n\n\\end{a}",
                outStr: "\\begin{a}\n\t%\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a}%\n\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}%\n\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a}\n\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}\n\\begin{a}\n\\end{a}",
            },
        ];

        const formatter = (x) =>
            Prettier.format(x, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("prints math environments", () => {
        const STRINGS = [
            { inStr: "\\[x\\]", outStr: "\\[\n\tx\n\\]" },
            { inStr: "\\[\\]", outStr: "\\[\n\\]" },
            { inStr: "\\[ \\]", outStr: "\\[\n\\]" },
            { inStr: "\\[\n\n\\]", outStr: "\\[\n\\]" },
            { inStr: "\\[\n\nx\n\\]", outStr: "\\[\n\tx\n\\]" },
            { inStr: "\\[%xx\n\\]", outStr: "\\[%xx\n\\]" },
            { inStr: "\\[\n%xx\n\\]", outStr: "\\[\n\t%xx\n\\]" },
            // Special case of empty inline math environment
            { inStr: "$ $", outStr: "$ $" },
            { inStr: "$\n$", outStr: "$ $" },
            { inStr: "$x$", outStr: "$x$" },
            { inStr: "$\nx$", outStr: "$x$" },
            { inStr: "$ x \n$", outStr: "$x$" },
            { inStr: "$%\n$", outStr: "$%\n$" },
            { inStr: "$a%\n$", outStr: "$a%\n$" },
            { inStr: "$\na%\n$", outStr: "$a%\n$" },
            { inStr: "$%x\na%\n$", outStr: "$%x\na%\n$" },
        ];

        const formatter = (x) =>
            Prettier.format(x, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("insert newlines around environments", () => {
        const STRINGS = [
            { inStr: "\\[\\] x", outStr: "\\[\n\\]\nx" },
            { inStr: "y \\[\\]", outStr: "y\n\\[\n\\]" },
            { inStr: "\\[\\]\\[\\]", outStr: "\\[\n\\]\n\\[\n\\]" },
            { inStr: "\\[\\] \\[\\]", outStr: "\\[\n\\]\n\\[\n\\]" },
            { inStr: "\\[\\]\n\\[\\]", outStr: "\\[\n\\]\n\\[\n\\]" },
            { inStr: "\\[\\]\n\n\\[\\]", outStr: "\\[\n\\]\n\n\\[\n\\]" },
            {
                inStr: "\\begin{a}\\end{a} x",
                outStr: "\\begin{a}\n\\end{a}\nx",
            },
            {
                inStr: "y \\begin{a}\\end{a}",
                outStr: "y\n\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a}\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}\n\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a} \\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}\n\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a}\n\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}\n\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\\end{a}\n\n\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}\n\n\\begin{a}\n\\end{a}",
            },
        ];

        const formatter = (x) =>
            Prettier.format(x, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("verb tests", () => {
        const STRINGS = [
            { inStr: "\\verb|%$\n|", outStr: "\\verb|%$\n|" },
            { inStr: "\\verb!{!", outStr: "\\verb!{!" },
            { inStr: "x\\verb!{!", outStr: "x\\verb!{!" },
            { inStr: "\\verb!{!y", outStr: "\\verb!{!y" },
            { inStr: "\\verb!{! y", outStr: "\\verb!{! y" },
            { inStr: "\\verb!%!\ny", outStr: "\\verb!%! y" },
        ];

        const formatter = (x) =>
            Prettier.format(x, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("verbatim environments tests", () => {
        const STRINGS = [
            {
                inStr: "\\begin{verbatim}\\end{verbatim}",
                outStr: "\\begin{verbatim}\\end{verbatim}",
            },
            {
                inStr: "\\begin{verbatim}a b  c\\end{verbatim}",
                outStr: "\\begin{verbatim}a b  c\\end{verbatim}",
            },
            {
                inStr: "\\begin{verbatim}\na b \n\n c\\end{verbatim}",
                outStr: "\\begin{verbatim}\na b \n\n c\\end{verbatim}",
            },
            {
                inStr: "\\begin{verbatim}\n\\end{verbatim}",
                outStr: "\\begin{verbatim}\n\\end{verbatim}",
            },
            {
                inStr: "a \\begin{verbatim}\\end{verbatim}",
                outStr: "a\n\\begin{verbatim}\\end{verbatim}",
            },
            {
                inStr: "\\begin{verbatim}\\end{verbatim} b",
                outStr: "\\begin{verbatim}\\end{verbatim}\nb",
            },
            {
                inStr: "\\begin{verbatim*}\n\n\n  $\\end{verbatim*}",
                outStr: "\\begin{verbatim*}\n\n\n  $\\end{verbatim*}",
            },
            {
                inStr: "\\begin{comment}\n\n\n  $\\end{comment}",
                outStr: "\\begin{comment}\n\n\n  $\\end{comment}",
            },
            {
                inStr: "\\begin{comment}\n\n\n  $\\end{comment}",
                outStr: "\\begin{comment}\n\n\n  $\\end{comment}",
            },
            {
                inStr:
                    "\\begin{a}\\begin{comment}\n\n\n  $\\end{comment}\\end{a}",
                outStr:
                    "\\begin{a}\n\t\\begin{comment}\n\n\n  $\\end{comment}\n\\end{a}",
            },
        ];

        const formatter = (x) =>
            Prettier.format(x, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("comments at start of environments tests", () => {
        const STRINGS = [
            {
                inStr: "\\begin{a}\\end{a}",
                outStr: "\\begin{a}\n\\end{a}",
            },
            {
                inStr: "\\begin{a}%xx\n\\end{a}",
                outStr: "\\begin{a}%xx\n\\end{a}",
            },
            {
                inStr: "\\begin{a} %xx\n\\end{a}",
                outStr: "\\begin{a} %xx\n\\end{a}",
            },
            {
                inStr: "\\begin{a} %xx\n%y\n\\end{a}",
                outStr: "\\begin{a} %xx\n\t%y\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\n%xx\n%y\n\\end{a}",
                outStr: "\\begin{a}\n\t%xx\n\t%y\n\\end{a}",
            },
            {
                inStr: "\\begin{a}\n %xx\n%y\n\\end{a}",
                outStr: "\\begin{a}\n\t%xx\n\t%y\n\\end{a}",
            },
            // Math environments should print the same way
            {
                inStr: "\\begin{equation}\\end{equation}",
                outStr: "\\begin{equation}\n\\end{equation}",
            },
            {
                inStr: "\\begin{equation}%xx\n\\end{equation}",
                outStr: "\\begin{equation}%xx\n\\end{equation}",
            },
            {
                inStr: "\\begin{equation} %xx\n\\end{equation}",
                outStr: "\\begin{equation} %xx\n\\end{equation}",
            },
            {
                inStr: "\\begin{equation} %xx\n%y\n\\end{equation}",
                outStr: "\\begin{equation} %xx\n\t%y\n\\end{equation}",
            },
            {
                inStr: "\\begin{equation}\n%xx\n%y\n\\end{equation}",
                outStr: "\\begin{equation}\n\t%xx\n\t%y\n\\end{equation}",
            },
            {
                inStr: "\\begin{equation}\n %xx\n%y\n\\end{equation}",
                outStr: "\\begin{equation}\n\t%xx\n\t%y\n\\end{equation}",
            },
        ];

        const formatter = (x) =>
            Prettier.format(x, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it("matrix environment tests", () => {
        const STRINGS = [
            {
                inStr: "\\begin{matrix}a\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}a\\\\b\\\\c\\end{matrix}",
                outStr:
                    "\\begin{matrix}\n\ta \\\\\n\tb \\\\\n\tc\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}a&b\\\\c&d\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta & b \\\\\n\tc & d\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}axxx&b\\\\c&d\\end{matrix}",
                outStr:
                    "\\begin{matrix}\n\taxxx & b \\\\\n\tc    & d\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}axxx&b\\\\c&dxxx\\end{matrix}",
                outStr:
                    "\\begin{matrix}\n\taxxx & b    \\\\\n\tc    & dxxx\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}a\\\\[4pt]b\\\\c\\end{matrix}",
                outStr:
                    "\\begin{matrix}\n\ta \\\\[4pt]\n\tb \\\\\n\tc\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}a\\\\%\nb\\\\c\\end{matrix}",
                outStr:
                    "\\begin{matrix}\n\ta \\\\ %\n\tb \\\\\n\tc\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}\n%xx\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\t%xx\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}\n%xx\n%yyy\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\t%xx\n\t%yyy\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}\n%xx\n  %yyy\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\t%xx\n\t%yyy\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}x%xx\n  %yyy\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\tx %xx\n\t%yyy\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}x&y%xx\n  %yyy\n\\end{matrix}",
                outStr: "\\begin{matrix}\n\tx & y %xx\n\t%yyy\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}x&y\\\\%xx\n  %yyy\n\\end{matrix}",
                outStr:
                    "\\begin{matrix}\n\tx & y \\\\ %xx\n\t%yyy\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}x\n%y\n\\\\z\\\\%ww\n\\end{matrix}",
                outStr:
                    "\\begin{matrix}\n\tx %y\n\t\\\\\n\tz \\\\ %ww\n\\end{matrix}",
            },
        ];

        const formatter = (x) =>
            Prettier.format(x, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });
    
    it("matrix environment with comments at start", () => {
        const STRINGS = [
            {
                inStr: "\\begin{matrix}%xx\na\\end{matrix}",
                outStr: "\\begin{matrix}%xx\n\ta\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix} %xx\na\\end{matrix}",
                outStr: "\\begin{matrix} %xx\n\ta\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}    %xx\na\\end{matrix}",
                outStr: "\\begin{matrix} %xx\n\ta\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}%xx\n%ab\na\\end{matrix}",
                outStr: "\\begin{matrix}%xx\n\t%ab\n\ta\n\\end{matrix}",
            },
        ];

        const formatter = (x) =>
            Prettier.format(x, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });
    
    it("matrix environment alignment of cell items", () => {
        const STRINGS = [
            {
                inStr: "\\begin{matrix}\na\\\\ b\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta \\\\\n\tb\n\\end{matrix}",
            },
            {
                inStr: "\\begin{matrix}\na\\\\\n\\\\\\end{matrix}",
                outStr: "\\begin{matrix}\n\ta \\\\\n\t\\\\\n\\end{matrix}",
            },
        ];

        const formatter = (x) =>
            Prettier.format(x, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });

    it.skip("prints latex code", () => {
        //const TEX = String.raw`\hi 22, I am % cool !
        let TEX = "a%\n  b";
        TEX = String.raw`\begin{xx}
\end{xx}
`;
        const parsed = latexParser.parse(TEX);
        console.log("PARSED", parsed);
        const formatted = Prettier.format(TEX, {
            printWidth: 30,
            useTabs: true,
            parser: "latex-parser",
            plugins: [prettierPluginLatex],
        });
        origLog("Raw print:", latexParser.printRaw(parsed));
        origLog(`Formatted as: '${formatted}'`);
        //        console.log(TEX);
        //        console.log(formatted);
    });

    it.skip("Formats aligned environments", () => {
        const STRINGS = [
            {
                inStr: "\\begin{align}ab& c\\\\d&eee\\end{align}",
                outStr:
                    "\\begin{align}\n\tab & c   \\\\\n\td  & eee\n\\end{align}",
            },
            {
                inStr: "\\begin{align}& c\\\\d&e\\end{align}",
                outStr: "\\begin{align}\n\t  & c \\\\\n\td & e\n\\end{align}",
            },
            {
                inStr: "\\begin{align}a&b\\\\[44pt]d&e\\\\xx&yy\\end{align}",
                outStr:
                    "\\begin{align}\n\ta  & b  \\\\[44pt]\n\td  & e  \\\\\n\txx & yy\n\\end{align}",
            },
            {
                inStr: "\\begin{align}a\\\\\\hline bbb\\end{align}",
                outStr:
                    "\\begin{align}\n\ta   \\\\\n\t\\hline\n\tbbb\n\\end{align}",
            },
        ];

        for (const { inStr, outStr } of STRINGS) {
            const formatted = Prettier.format(inStr, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });
            expect(formatted).toEqual(outStr);
        }

        let ast; //= latexParser.parse("ab&c\\\\d&eee\\hline");
        //let split = prettierPluginLatex.formatAlignedContent(ast);
        //console.log(ast);
        //console.log(split);

        const TEX = "$a*\n\\begin{matrix}a\\\\ bbb\\end{matrix}*c$";
        const parsed = latexParser.parse(TEX);
        console.log("PARSED", parsed);
        const formatted = Prettier.format(TEX, {
            printWidth: 30,
            useTabs: true,
            parser: "latex-parser",
            plugins: [prettierPluginLatex],
        });
        origLog("Raw print:", latexParser.printRaw(parsed));
        origLog(`Formatted as: '${formatted}'`);
        //console.log(TEX);
        //console.log(formatted);
    });
});
