import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { strToNodesRaw } from "../../test-common";
import { arg, m } from "../../unified-latex-builder";
import * as Ast from "../../unified-latex-types";
import { processLatexViaUnified } from "../../unified-latex-util-parse";
import { unifiedLatexReplaceStreamingCommands } from "../libs/unified-latex-streaming-command";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-util-replace:unified-latex-replace-streaming-command", () => {
    let file: VFile;

    it("can replace streaming commands", () => {
        const replacer = (nodes: Ast.Node[], macro: Ast.Macro) =>
            m(macro.content.toUpperCase(), arg(nodes));
        const replacers = { foo: replacer, bar: replacer };

        const process = (value: string) =>
            processLatexViaUnified()
                .use(unifiedLatexReplaceStreamingCommands, {
                    replacers,
                })
                .processSync({ value });

        file = process("x \\foo y z");
        expect(file.value).toEqual("x \\FOO{y z}");

        file = process("x \\foo y\n\nz");
        expect(file.value).toEqual("x \\FOO{y}\n\n\\FOO{z}");
        
        file = process("x \\foo y \\bar yy\n\nz");
        expect(file.value).toEqual("x \\FOO{y \\BAR{yy}}\n\n\\FOO{\\BAR{z}}");
    });
});
