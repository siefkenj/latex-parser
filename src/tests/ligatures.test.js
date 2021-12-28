import util from "util";

import * as latexParser from "../parsers/parser";
import * as tools from "../tools";
import { trimRenderInfo } from "../libs/ast";
import { parseLigatures } from "../parsers/ligatures";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("Ligature substitutions", () => {
    it("can replace string ligatures", () => {
        let ast = trimRenderInfo(latexParser.parse("a---b")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("a—b");
        ast = trimRenderInfo(latexParser.parse("a--b")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("a–b");
        ast = trimRenderInfo(latexParser.parse("a``b")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("a“b");
        ast = trimRenderInfo(latexParser.parse("a''b")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("a”b");
        ast = trimRenderInfo(latexParser.parse("a`b")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("a‘b");
        ast = trimRenderInfo(latexParser.parse("a\\$b")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("a$b");
    });
    it("can replace macro ligatures", () => {
        let ast = trimRenderInfo(latexParser.parse('a\\"ob')).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("aöb");

        ast = trimRenderInfo(latexParser.parse("a\\^ob")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("aôb");

        ast = trimRenderInfo(latexParser.parse("a\\pounds b")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("a£ b");

        ast = trimRenderInfo(latexParser.parse("a\\v sb")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("ašb");
    });
    it("can replace macro ligatures with an argument in a group", () => {
        let ast = trimRenderInfo(latexParser.parse('a\\"{o}b')).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("aöb");

        ast = trimRenderInfo(latexParser.parse("a\\^{o}b")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("aôb");

        ast = trimRenderInfo(latexParser.parse("a\\v{s}b")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("ašb");

        ast = trimRenderInfo(latexParser.parse("a\\v {s}b")).content;
        expect(latexParser.printRaw(parseLigatures(ast))).toEqual("ašb");
    });
    it("expands ligatures in text mode but not math mode", () => {
        let ast = trimRenderInfo(latexParser.parse("a\\&$\\&$b"));
        expect(latexParser.printRaw(tools.expandUnicodeLigatures(ast))).toEqual(
            "a&$\\&$b"
        );
    });
});
