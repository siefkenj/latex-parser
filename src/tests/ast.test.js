import util from "util";

import * as latexParser from "../parsers/parser";
import * as macroUtils from "../libs/macro-utils";
import { replaceNode, trimRenderInfo, match } from "../libs/ast";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("AST tests", () => {
    function strToNodes(str) {
        return trimRenderInfo(latexParser.parse(str)).content;
    }
    it("trims whitespace/parbreaks in math environments", () => {
        // Display math
        let targetAst = strToNodes("\\[\\]");

        let ast = strToNodes("\\[ \\]");
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\[\n\\]");
        expect(ast).toEqual(targetAst);

        // Inline math
        ast = strToNodes("$ $");
        expect(ast).toEqual([{ type: "inlinemath", content: [] }]);

        ast = strToNodes("$\n$");
        expect(ast).toEqual([{ type: "inlinemath", content: [] }]);

        // Environments
        targetAst = strToNodes("\\begin{equation}\\end{equation}");

        ast = strToNodes("\\begin{equation} \\end{equation}");
        expect(ast).toEqual(targetAst);

        ast = strToNodes("\\begin{equation}\n \\end{equation}");
        expect(ast).toEqual(targetAst);
        // Display math
    });

    it("merges whitespace and parbreaks", () => {
        // wrap the parbreak in a group so that it doesn't get trimmed by the parser
        let targetAst = trimRenderInfo(latexParser.parse("{\n\n}")).content;

        let ast = trimRenderInfo(latexParser.parse("{\n}")).content;
        expect(macroUtils.trim(ast)).not.toEqual(targetAst);

        ast = trimRenderInfo(latexParser.parse("{\n\n\n}")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        ast = trimRenderInfo(latexParser.parse("{\n\n \n}")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);

        ast = trimRenderInfo(latexParser.parse("{\n\n \n\n}")).content;
        expect(macroUtils.trim(ast)).toEqual(targetAst);
    });

    it("Can replace macros", () => {
        let targetAst = trimRenderInfo(
            latexParser.parse("\\foo and \\bar")
        ).content;
        let insertNode = trimRenderInfo(latexParser.parse("\\bar")).content;
        let ast = trimRenderInfo(latexParser.parse("\\foo and \\raw")).content;

        ast = replaceNode(
            ast,
            () => insertNode,
            (node) => match.macro(node, "raw")
        );
        expect(macroUtils.trim(ast)).toEqual(targetAst);
    });
});
