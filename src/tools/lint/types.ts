import * as Ast from "../../libs/ast-types";

export interface Lint {
    description: string;
}
export interface LintPlugin {
    description: string;
    lint: (ast: Ast.Ast) => Lint[];
    fixAll: (ast: Ast.Ast) => Ast.Ast;
}
