import * as Ast from "unified-latex/unified-latex-types";

export interface Lint {
    description: string;
}
export interface LintPlugin {
    description: string;
    lint: (ast: Ast.Ast) => Lint[];
    fixAll: (ast: Ast.Ast) => Ast.Ast;
}
