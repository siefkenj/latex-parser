import util from "util";

import * as latexParser from "../parsers/parser";
import { walkAst } from "../libs/ast";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("AST walkers", () => {
    it("passes in `inMathMode` context while walking", () => {
        let ast = latexParser.parse("a $b^{e}$ c");
        let expected = ["b^{e}", "{e}", "e"];
        let received = [];

        // Walk through all arrays that have `inMathMode===true`
        walkAst(
            ast,
            (nodes) => {
                received.push(latexParser.printRaw(nodes));
                return nodes;
            },
            (node, context) =>
                Array.isArray(node) && context.inMathMode === true
        );
        expect(received).toEqual(expected);

        ast = latexParser.parse("a \\[b^{e}\\] c");
        expected = ["b^{e}", "{e}", "e"];
        received = [];

        // Walk through all arrays that have `inMathMode===true`
        walkAst(
            ast,
            (nodes) => {
                received.push(latexParser.printRaw(nodes));
                return nodes;
            },
            (node, context) =>
                Array.isArray(node) && context.inMathMode === true
        );
        expect(received).toEqual(expected);

        ast = latexParser.parse("a \\begin{align}b^{e}\\end{align} c");
        expected = ["b^{e}", "{e}", "e"];
        received = [];

        // Walk through all arrays that have `inMathMode===true`
        walkAst(
            ast,
            (nodes) => {
                received.push(latexParser.printRaw(nodes));
                return nodes;
            },
            (node, context) =>
                Array.isArray(node) && context.inMathMode === true
        );
        expect(received).toEqual(expected);

        ast = latexParser.parse("a $b$ c $d$");
        expected = ["b", "d"];
        received = [];

        // Walk through all arrays that have `inMathMode===true`
        walkAst(
            ast,
            (nodes) => {
                received.push(latexParser.printRaw(nodes));
                return nodes;
            },
            (node, context) =>
                Array.isArray(node) && context.inMathMode === true
        );
        expect(received).toEqual(expected);
    });
    it("passes in `inMathMode` context while walking nested structures", () => {
        let ast = latexParser.parse("a $b\\text{some $math$}$ c");
        let expected = ["b\\text{some $math$}", "math"];
        let received = [];

        // Walk through all arrays that have `inMathMode===true`
        walkAst(
            ast,
            (nodes) => {
                received.push(latexParser.printRaw(nodes));
                return nodes;
            },
            (node, context) =>
                Array.isArray(node) && context.inMathMode === true
        );
        expect(received).toEqual(expected);

        ast = latexParser.parse("a $b\\text{some $math\\text{deep$x$}$}$ c");
        expected = [
            "b\\text{some $math\\text{deep$x$}$}",
            "math\\text{deep$x$}",
            "x",
        ];
        received = [];

        // Walk through all arrays that have `inMathMode===true`
        walkAst(
            ast,
            (nodes) => {
                received.push(latexParser.printRaw(nodes));
                return nodes;
            },
            (node, context) =>
                Array.isArray(node) && context.inMathMode === true
        );
        expect(received).toEqual(expected);
    });
});
