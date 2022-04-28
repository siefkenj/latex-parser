import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../../libs/ast";
import * as Ast from "../../unified-latex-types";
import { attachMacroArgs } from "../../unified-latex-util-arguments";
import { processLatexToAstViaUnified } from "../../unified-latex-util-parse";
import { printRaw } from "../../unified-latex-util-print";
import { cleanEnumerateBody } from "../utils/enumerate";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-ctan:enumerate", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    function strToNodes(str: string) {
        value = str;
        file = processLatexToAstViaUnified().processSync({ value });
        return trimRenderInfo((file.result as any).content) as Ast.Node[];
    }

    it("Cleans an enumerate body", () => {
        const STRINGS = [
            [" abc ", "abc"],
            [" \\item   xxx", "\\item xxx"],
            ["\\item45\\item hey there", "\\item 45\n\n\\item hey there"],
            ["good  \\item stuff\\item ", "good\n\n\\item stuff\n\n\\item"],
            [
                "good  \\item [xxx]stuff\\item ",
                "good\n\n\\item[xxx] stuff\n\n\\item",
            ],
        ];
        for (const [inStr, outStr] of STRINGS) {
            let ast = strToNodes(inStr);
            ast = cleanEnumerateBody(ast);
            expect(printRaw(ast)).toEqual(outStr);
        }
    });

    it("Cleans an enumerate body with custom \\item macro name", () => {
        // subs for a different macro
        const [inStr, outStr] = [
            "\\item4 x \\xxx yo there\\xxx\n\ngood ",
            "\\item4 x\n\n\\xxx yo there\n\n\\xxx good",
        ];
        let ast = strToNodes(inStr);
        ast = cleanEnumerateBody(ast, "xxx");
        expect(printRaw(ast)).toEqual(outStr);
    });
});
