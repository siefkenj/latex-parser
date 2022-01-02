import * as Ast from "../../libs/ast-types";
import { argumentFontShapingCommandsLint } from "./rules/argument-font-shaping-commands";
import { texFontShapingCommandsLint } from "./rules/tex-font-shaping-commands";
import { useOperatorMacrosInMathMode } from "./rules/use-operator-macros-in-math-mode";
import { Lint } from "./types";

export const lints = {
    texFontShapingCommandsLint,
    argumentFontShapingCommandsLint,
    useOperatorMacrosInMathMode,
};

export function applyAll(ast: Ast.Ast): Ast.Ast {
    ast = lints.texFontShapingCommandsLint.fixAll(ast);
    ast = lints.argumentFontShapingCommandsLint.fixAll(ast);
    ast = lints.useOperatorMacrosInMathMode.fixAll(ast);
    return ast;
}

export function lintAll(ast: Ast.Ast): Lint[] {
    return [
        ...lints.texFontShapingCommandsLint.lint(ast),
        ...lints.argumentFontShapingCommandsLint.lint(ast),
        ...lints.useOperatorMacrosInMathMode.lint(ast),
    ];
}
