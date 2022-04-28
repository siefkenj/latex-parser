import { strictEqual } from "assert";
import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../../libs/ast";
import * as Ast from "../../unified-latex-types";
import { processLatexToAstViaUnified } from "..";
import { parse } from "../../../parsers/latex-parser";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-parse", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    function strToNodes(str: string) {
        value = str;
        file = processLatexToAstViaUnified().processSync({ value });
        return trimRenderInfo((file.result as any).content) as Ast.Node[];
    }

    it("can parse", () => {
        value = "$\\frac{ab^2}{5}$";
        file = processLatexToAstViaUnified().processSync({ value });

        //       console.log(file.result);
        //    console.log(processLatexToAstViaUnifiedNew().parse({ value }));
        //console.log(parse(value))
    });
});
