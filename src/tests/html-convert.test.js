import util from "util";
import prettier from "prettier";
import { tools } from "../parsers/latex-parser";

import * as latexParser from "../parsers/parser";
import { convertToHtml } from "../tools/html/convert";
import { wrapPars } from "../tools/html/paragraph-split";

const { printRaw } = latexParser;
function normalizeHtml(str) {
    return prettier.format(str, { parser: "html" });
}
/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("Convert to HTML", () => {
    it("Can replace text-style macros", () => {
        let ast = latexParser.parse(String.raw`a \textbf{different} word`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`a <b class="textbf">different</b> word`)
        );

        ast = latexParser.parse(String.raw`a \textsf{different} word`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`a <span class="textsf">different</span> word`)
        );

        ast = latexParser.parse(String.raw`a \textrm{different} word`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`a <span class="textrm">different</span> word`)
        );

        ast = latexParser.parse(String.raw`a \emph{different} word`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`a <em class="emph">different</em> word`)
        );
    });
    it("Can replace headings", () => {
        let ast = latexParser.parse(String.raw`\chapter{My Chapter}`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`<h2>My Chapter</h2>`)
        );

        ast = latexParser.parse(String.raw`\section{My Section}`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`<h3>My Section</h3>`)
        );

        ast = latexParser.parse(String.raw`\section*{My Section}`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`<h3 class="starred">My Section</h3>`)
        );
    });
    it("Can wrap in <p>...</p> tags", () => {
        let ast = latexParser.parse(String.raw`a\par b`).content;
        expect(normalizeHtml(printRaw(convertToHtml(wrapPars(ast))))).toEqual(
            normalizeHtml(`<p>a</p><p>b</p>`)
        );

        ast = latexParser.parse(`a\n\n b`).content;
        expect(normalizeHtml(printRaw(convertToHtml(wrapPars(ast))))).toEqual(
            normalizeHtml(`<p>a</p><p>b</p>`)
        );

        ast = latexParser.parse(`a\n b`).content;
        expect(normalizeHtml(printRaw(convertToHtml(wrapPars(ast))))).toEqual(
            normalizeHtml(`<p>a b</p>`)
        );
        ast = latexParser.parse(`a\\section{foo} b`).content;
        expect(normalizeHtml(printRaw(convertToHtml(wrapPars(ast))))).toEqual(
            normalizeHtml(`<p>a</p><h3>foo</h3><p>b</p>`)
        );
        ast = latexParser.parse(`a\\section{foo} b\\section{bar}`).content;
        expect(normalizeHtml(printRaw(convertToHtml(wrapPars(ast))))).toEqual(
            normalizeHtml(`<p>a</p><h3>foo</h3><p>b</p><h3>bar</h3>`)
        );
        ast = latexParser.parse(`a\n \\emph{b}`).content;
        expect(normalizeHtml(printRaw(convertToHtml(wrapPars(ast))))).toEqual(
            normalizeHtml(`<p>a <em class="emph">b</em></p>`)
        );
        ast = latexParser.parse(`a\n b\\begin{foo}x\\end{foo}c`).content;
        expect(normalizeHtml(printRaw(convertToHtml(wrapPars(ast))))).toEqual(
            normalizeHtml(`<p>a b</p>\\begin{foo}x\\end{foo}<p>c</p>`)
        );
    });
    it("Comments are removed from HTML", () => {
        let ast = latexParser.parse(`a % foo\nb`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`a b`)
        );

        ast = latexParser.parse(`a% foo\nb`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`ab`)
        );

        ast = latexParser.parse(`a% foo\n\nb`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`a\nb`)
        );

        ast = latexParser.parse(`a % foo\n\nb`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`a\nb`)
        );
    });
    it("Wraps URLs", () => {
        let ast = latexParser.parse(`a\\url{foo.com}b`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`a<a class="url" href="foo.com">foo.com</a>b`)
        );

        ast = latexParser.parse(`a\\href{foo.com}{FOO}b`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`a<a class="href" href="foo.com">FOO</a>b`)
        );
    });
    it("Converts enumerate environments", () => {
        let ast = latexParser.parse(
            `\\begin{enumerate}\\item a\\item b\\end{enumerate}`
        );
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(
                `<ol class="enumerate"><li><p>a</p></li><li><p>b</p></li></ol>`
            )
        );

        // Any content before an \item is ignored
        ast = latexParser.parse(
            `\\begin{enumerate}before content\\item a\\item b\\end{enumerate}`
        );
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(
                `<ol class="enumerate"><li><p>a</p></li><li><p>b</p></li></ol>`
            )
        );

        // Custom labels are handled
        ast = latexParser.parse(
            `\\begin{enumerate}before content\\item[x)] a\\item[] b\\end{enumerate}`
        );
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`<ol class="enumerate">
                <li style="list-style-type: 'x) ';"><p>a</p></li>
                <li style="list-style-type: none;"><p>b</p></li>
            </ol>`)
        );
    });
    it("Converts itemize environments", () => {
        let ast = latexParser.parse(
            `\\begin{itemize}\\item a\\item b\\end{itemize}`
        );
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(
                `<ul class="itemize"><li><p>a</p></li><li><p>b</p></li></ul>`
            )
        );

        // Any content before an \item is ignored
        ast = latexParser.parse(
            `\\begin{itemize}before content\\item a\\item b\\end{itemize}`
        );
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(
                `<ul class="itemize"><li><p>a</p></li><li><p>b</p></li></ul>`
            )
        );

        // Custom labels are handled
        ast = latexParser.parse(
            `\\begin{itemize}before content\\item[x)] a\\item[] b\\end{itemize}`
        );
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`<ul class="itemize">
                <li style="list-style-type: 'x) ';"><p>a</p></li>
                <li style="list-style-type: none;"><p>b</p></li>
            </ul>`)
        );
    });
});

describe("HTML Generation", () => {
    it("Can generate html-like tags", () => {
        let content = latexParser.parse("$x^{2}$").content;

        let tag = tools.tagLikeMacro({ tag: "foo" });
        expect(printRaw(tag)).toEqual("<foo />");

        tag = tools.tagLikeMacro({ tag: "foo", content });
        expect(printRaw(tag)).toEqual("<foo>$x^{2}$</foo>");

        tag = tools.tagLikeMacro({
            tag: "foo",
            content,
            attributes: { attr1: "val1", attr2: "val2" },
        });
        expect(printRaw(tag)).toEqual(
            '<foo attr1="val1" attr2="val2">$x^{2}$</foo>'
        );

        // empty attributes shouldn't add spurious whitespace
        tag = tools.tagLikeMacro({
            tag: "foo",
            content,
            attributes: {},
        });
        expect(printRaw(tag)).toEqual("<foo>$x^{2}$</foo>");

        tag = tools.tagLikeMacro({
            tag: "foo",
            attributes: { attr1: "val1", attr2: "val2" },
        });
        expect(printRaw(tag)).toEqual('<foo attr1="val1" attr2="val2" />');
    });

    it("Macros aren't replaced with html code in math mode", () => {
        let ast;

        // Custom labels are handled
        ast = latexParser.parse(`\\[a\\\\b\\]`);
        expect(normalizeHtml(printRaw(convertToHtml(ast)))).toEqual(
            normalizeHtml(`\\[a\\\\b\\]`)
        );
    });
});
