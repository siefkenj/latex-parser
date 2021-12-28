import util from "util";
import { attachMacroArgsInArray } from "../libs/ast";

import * as latexParser from "../parsers/parser";
import { createMacroExpander, expandMacros } from "../tools";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("Macro expansion", () => {
    it("Can expand ## to #", () => {
        let macroBody = latexParser.parse(
            String.raw`a b ## c ####2 ##1`
        ).content;
        const expander = createMacroExpander(macroBody);
        expect(latexParser.printRaw(expander(latexParser.parse("")))).toEqual(
            "a b # c ##2 #1"
        );
    });

    it("Can substitute #1 and #2 for arguments", () => {
        let substitutionBody = latexParser.parse("a b #1 c ##2 #2").content;
        // This macro defines the args that will be substituted
        let macro = latexParser.parse("\\xxx{A}{B}").content;
        macro = attachMacroArgsInArray(macro, { xxx: { signature: "m m" } })[0];

        const expander = createMacroExpander(substitutionBody);
        expect(latexParser.printRaw(expander(macro))).toEqual("a b A c #2 B");
    });

    it("Can substitute if nested", () => {
        let substitutionBody = latexParser.parse("a b {#1 c ##2 #2}").content;
        // This macro defines the args that will be substituted
        let macro = latexParser.parse("\\xxx{A}{B}").content;
        macro = attachMacroArgsInArray(macro, { xxx: { signature: "m m" } })[0];

        const expander = createMacroExpander(substitutionBody);
        expect(latexParser.printRaw(expander(macro))).toEqual("a b {A c #2 B}");
    });

    it("Can substitute if in argument", () => {
        let substitutionBody = latexParser.parse("a b \\mathbb{#1}").content;
        // This macro defines the args that will be substituted
        let macro = latexParser.parse("\\xxx{A}{B}").content;
        macro = attachMacroArgsInArray(macro, { xxx: { signature: "m m" } })[0];

        const expander = createMacroExpander(substitutionBody);
        expect(latexParser.printRaw(expander(macro))).toEqual(
            "a b \\mathbb{A}"
        );
    });

    it("Can substitute if in math", () => {
        let substitutionBody = latexParser.parse("a $x^{#1}_{#2}$").content;
        // This macro defines the args that will be substituted
        let macro = latexParser.parse("\\xxx{A}{B}").content;
        macro = attachMacroArgsInArray(macro, { xxx: { signature: "m m" } })[0];

        const expander = createMacroExpander(substitutionBody);
        expect(latexParser.printRaw(expander(macro))).toEqual("a $x^{A}_{B}$");
    });

    it("Can expand macro", () => {
        let substitution = latexParser.parse("$x^{#1}_{#2}$").content;
        let macro = latexParser.parse(
            "Look at \\xxx{A}{B} and \\xxx{me}{you}"
        ).content;
        macro = attachMacroArgsInArray(macro, { xxx: { signature: "m m" } });

        let expanded = expandMacros(macro, [{ name: "xxx", substitution }]);
        expect(latexParser.printRaw(expanded)).toEqual(
            "Look at $x^{A}_{B}$ and $x^{me}_{you}$"
        );
    });
});
