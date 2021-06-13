import type { Plugin, Printer } from "prettier";

import { parse } from "./parsers/parser";
import { printLatexAst } from "./printers/printer";
import * as Ast from "./libs/ast-types";
import { parseTikzEnvironment } from "./parsers/tikz-environment";

const languages = [
    {
        name: "latex",
        extensions: [".tex"],
        parsers: ["latex-parser"],
    },
];

const parsers = {
    "latex-parser": {
        parse,
        astFormat: "latex-ast",
        locStart: (node: Ast.Node) => (node.loc ? node.loc.start.offset : 0),
        locEnd: (node: Ast.Node) => (node.loc ? node.loc.end.offset : 1),
    },
};

const printers = {
    "latex-ast": {
        print: printLatexAst,
    } as Printer,
};

const plugin: Plugin = { languages, parsers, printers };

export default plugin;
