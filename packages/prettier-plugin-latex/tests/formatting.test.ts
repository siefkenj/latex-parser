import Prettier from "prettier/standalone";
import "./test-common";
import prettierPluginLatex from "../src";
import {prettyPrint} from "../src/standalone"


/* eslint-env jest */

describe("prettier-plugin-latex", () => {
    const formatter = (x: string) =>
        Prettier.format(x, {
            printWidth: 30,
            useTabs: true,
            parser: "latex-parser",
            plugins: [prettierPluginLatex],
        });
    it("prints latex code", () => {
        const STRINGS = [
            { inStr: "$x^{21}$", outStr: "$x^{21}$" },
            {
                inStr: "\\begin{enumerate}\\item a b c\\item\\end{enumerate}",
                outStr: "\\begin{enumerate}\n\t\\item a b c\n\n\t\\item\n\\end{enumerate}",
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
                    "\t\tstuff $\\mathbb{4}somegoodst\n" +
                    "\t\tuff$ is really, really\n" +
                    "\t\tgreat!}\n" +
                    "\n" +
                    "\t\\item and other stuff\n" +
                    "\\end{enumerate}",
            },
            {
                inStr: "\\begin{xx}\\begin{yy}x\\end{yy}\\end{xx}",
                outStr: "\\begin{xx}\n\t\\begin{yy}\n\t\tx\n\t\\end{yy}\n\\end{xx}",
            },
            { inStr: "\\begin{xx}\\end{xx}", outStr: "\\begin{xx}\n\\end{xx}" },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, formatter);
        }
    });
    it("standalone printer can print latex code", () => {
        const STRINGS = [
            { inStr: "$x^{21}$", outStr: "$x^{21}$" },
            {
                inStr: "\\begin{enumerate}\\item a b c\\item\\end{enumerate}",
                outStr: "\\begin{enumerate}\n\t\\item a b c\n\n\t\\item\n\\end{enumerate}",
            },
            {
                inStr: "\\begin{xx}\\begin{yy}x\\end{yy}\\end{xx}",
                outStr: "\\begin{xx}\n\t\\begin{yy}\n\t\tx\n\t\\end{yy}\n\\end{xx}",
            },
            { inStr: "\\begin{xx}\\end{xx}", outStr: "\\begin{xx}\n\\end{xx}" },
        ];

        for (const { inStr, outStr } of STRINGS) {
            expect(inStr).toFormatAs(outStr, prettyPrint);
        }
    });
});
