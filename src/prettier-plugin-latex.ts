import { parse } from "./libs/parser";
import { printLatexAst } from "./printers/printer";
import * as Ast from "./libs/ast-types";

export const languages = [
    {
        name: "latex",
        extensions: [".tex"],
        parsers: ["latex-parser"],
    },
];

export const parsers = {
    "latex-parser": {
        parse,
        astFormat: "latex-ast",
        locStart: (node: Ast.Node) => (node.loc ? node.loc.start.offset : 0),
        locEnd: (node: Ast.Node) => (node.loc ? node.loc.end.offset : 1),
    },
};

export const printers = {
    "latex-ast": {
        print: printLatexAst,
    },
};
