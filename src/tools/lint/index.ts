import * as Ast from "../../libs/ast-types";
import { argumentColorCommandsLint } from "./rules/argument-color-commands";
import { argumentFontShapingCommandsLint } from "./rules/argument-font-shaping-commands";
import { texFontShapingCommandsLint } from "./rules/tex-font-shaping-commands";
import { Lint } from "./types";

export const lints = {
    texFontShapingCommandsLint,
    argumentFontShapingCommandsLint,
    argumentColorCommandsLint,
};

export function applyAll(ast: Ast.Ast): Ast.Ast {
    ast = lints.texFontShapingCommandsLint.fixAll(ast);
    ast = lints.argumentFontShapingCommandsLint.fixAll(ast);
    ast = lints.argumentColorCommandsLint.fixAll(ast);
    return ast;
}

export function lintAll(ast: Ast.Ast): Lint[] {
    return [
        ...lints.texFontShapingCommandsLint.lint(ast),
        ...lints.argumentFontShapingCommandsLint.lint(ast),
        ...lints.argumentColorCommandsLint.lint(ast),
    ];
}
