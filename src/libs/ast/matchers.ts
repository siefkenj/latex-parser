import * as Ast from "../ast-types";
import { printRaw } from "../print-raw";

/**
 * Functions to match different types of nodes.
 */
export const match = {
    macro(node: any, macroName?: string): node is Ast.Macro {
        if (node == null) {
            return false;
        }
        return (
            node.type === "macro" &&
            (macroName == null || node.content === macroName)
        );
    },
    anyMacro(node: any): node is Ast.Macro {
        return match.macro(node);
    },
    environment(node: any, envName?: string): node is Ast.Environment {
        if (node == null) {
            return false;
        }
        return (
            (node.type === "environment" || node.type === "mathenv") &&
            (envName == null || printRaw(node.env) === envName)
        );
    },
    anyEnvironment(node: any): node is Ast.Environment {
        return match.environment(node);
    },
    comment(node: any): node is Ast.Comment {
        if (node == null) {
            return false;
        }
        return node.type === "comment";
    },
    parbreak(node: any): node is Ast.Parbreak {
        if (node == null) {
            return false;
        }
        return node.type === "parbreak";
    },
    whitespace(node: any): node is Ast.Whitespace {
        if (node == null) {
            return false;
        }
        return node.type === "whitespace";
    },
    string(node: any, value?: string): node is Ast.String {
        if (node == null) {
            return false;
        }
        return (
            node.type === "string" && (value == null || node.content === value)
        );
    },
    anyString(node: any): node is Ast.String {
        return match.string(node);
    },
    group(node: any): node is Ast.Group {
        if (node == null) {
            return false;
        }
        return node.type === "group";
    },
    argument(node: any): node is Ast.Argument {
        if (node == null) {
            return false;
        }
        return node.type === "argument";
    },
    blankArgument(node: any): boolean {
        if (!match.argument(node)) {
            return false;
        }
        return (
            node.openMark === "" &&
            node.closeMark === "" &&
            node.content.length === 0
        );
    },
    math(node: any): node is Ast.DisplayMath | Ast.InlineMath {
        if (node == null) {
            return false;
        }
        return node.type === "displaymath" || node.type === "inlinemath";
    },
};
