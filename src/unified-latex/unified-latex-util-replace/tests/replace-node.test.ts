import { strictEqual } from "assert";
import { VFile } from "unified-lint-rule/lib";
import util from "util";
import { trimRenderInfo } from "../../../libs/ast";
import * as Ast from "../../unified-latex-types";
import { processLatexToAstViaUnified } from "../../unified-latex-util-parse";
import { match } from "../../unified-latex-util-match";
import { replaceNode } from "../libs/replace-node";
import { s } from "../../unified-latex-builder";
import { printRaw } from "../../unified-latex-util-print-raw";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("unified-latex-replace", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    function strToNodes(str: string) {
        value = str;
        file = processLatexToAstViaUnified().processSync({ value });
        return trimRenderInfo((file.result as any).content) as Ast.Node[];
    }

    it("can replace nodes", () => {
        let nodes = strToNodes("a b c {a b} c");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return s("XX");
            }
        });
        expect(printRaw(nodes)).toEqual("XX b c {XX b} c");
    });

    it("can delete nodes", () => {
        let nodes = strToNodes("a b c {a b} c");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return null;
            }
        });
        expect(printRaw(nodes)).toEqual(" b c { b} c");
    });

    it("can replace with multiple nodes", () => {
        let nodes = strToNodes("a b c {a b} c");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return [s("x"), s("y")];
            }
        });
        expect(printRaw(nodes)).toEqual("xy b c {xy b} c");
    });

    it("doesn't get stuck in recursive loop when replacement contains replaceable item", () => {
        let nodes = strToNodes("a b c {a b} c");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return [s("a"), s("a")];
            }
        });
        expect(printRaw(nodes)).toEqual("aa b c {aa b} c");

        nodes = strToNodes("$aa$");
        replaceNode(nodes, (node) => {
            if (match.string(node, "a")) {
                return [s("a"), s("a")];
            }
        });
        expect(printRaw(nodes)).toEqual("$aaaa$");
    });
});
