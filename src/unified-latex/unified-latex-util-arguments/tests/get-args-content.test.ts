import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../../libs/ast";
import * as Ast from "../../unified-latex-types";
import { processLatexToAstViaUnified } from "../../unified-latex-util-parse";
import { attachMacroArgs } from "../libs/attach-arguments";
import { getArgsContent } from "../libs/get-args-content";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-arguments", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    function strToNodes(str: string) {
        value = str;
        file = processLatexToAstViaUnified().processSync({ value });
        const root = trimRenderInfo(file.result as any) as Ast.Root;
        return root.content;
    }

    it("can get args content", () => {
        // Recursively apply substitutions in groups
        let nodes = strToNodes("\\xxx b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "m",
            },
        });
        let args = getArgsContent(nodes[0] as Ast.Macro);
        expect(args).toEqual([[{ type: "string", content: "b" }]]);

        nodes = strToNodes("\\xxx b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "s m",
            },
        });
        args = getArgsContent(nodes[0] as Ast.Macro);
        expect(args).toEqual([null, [{ type: "string", content: "b" }]]);

        nodes = strToNodes("\\xxx*b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "s m",
            },
        });
        args = getArgsContent(nodes[0] as Ast.Macro);
        expect(args).toEqual([
            [{ type: "string", content: "*" }],
            [{ type: "string", content: "b" }],
        ]);

        nodes = strToNodes("\\xxx b");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "o m",
            },
        });
        args = getArgsContent(nodes[0] as Ast.Macro);
        expect(args).toEqual([null, [{ type: "string", content: "b" }]]);

        nodes = strToNodes("\\xxx[]{b}");
        attachMacroArgs(nodes, {
            xxx: {
                signature: "o m",
            },
        });
        args = getArgsContent(nodes[0] as Ast.Macro);
        expect(args).toEqual([[], [{ type: "string", content: "b" }]]);
    });
});
