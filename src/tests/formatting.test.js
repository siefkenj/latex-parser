import Prettier from "prettier/standalone";
import { origLog } from "./parser.test";

import * as latexParser from "../latex-parser";
import * as prettierPluginLatex from "../prettier-plugin-latex";

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

        for (const { inStr, outStr } of STRINGS) {
            const formatted = Prettier.format(inStr, {
                printWidth: 30,
                useTabs: true,
                parser: "latex-parser",
                plugins: [prettierPluginLatex],
            });
            expect(formatted).toEqual(outStr);
        }
    });

    it("prints latex code", () => {
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

    it.only("Formats aligned environments", () => {
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
