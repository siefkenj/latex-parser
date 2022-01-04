import {
    attachMacroArgs,
    match,
    processEnvironment,
    replaceNode,
    trim,
    walkAst,
} from "../libs/ast";
import * as Ast from "../libs/ast-types";
import { MatcherContext } from "../libs/ast/walkers";
import { trimEnvironmentContents } from "../libs/macro-utils";
import { printRaw } from "../libs/print-raw";
import { xcolorColorToHex } from "../libs/xcolor/xcolor";
import { parseLigatures } from "../parsers/ligatures";
import { parsePgfkeys } from "../parsers/pgfkeys-parser";
import { convertToHtml } from "./html/convert";
import { applyAll, lintAll, lints } from "./lint";
import {
    createMacroExpander,
    newcommandMacroToName,
    newcommandMacroToSpec,
    newcommandMacroToSubstitutionAst,
} from "./newcommand";
import { xcolorMacroToHex } from "./xcolor";

/**
 * Returns a set containing all macros in the document.
 *
 * @export
 * @param {Ast.Ast} ast
 * @returns {Map<string, Ast.Macro>}
 */
export function allMacros(ast: Ast.Ast): Map<string, Ast.Macro[]> {
    const ret: Map<string, Ast.Macro[]> = new Map();
    walkAst(
        ast,
        (node) => {
            const name = node.content;
            let newVal = ret.get(name) || [];
            newVal.push(node);
            ret.set(name, newVal);
            return node;
        },
        match.anyMacro
    );

    return ret;
}

/**
 * Returns a set containing all macros in the document.
 *
 * @export
 * @param {Ast.Ast} ast
 * @returns {Map<string, Ast.Macro>}
 */
export function allEnvironments(ast: Ast.Ast): Map<string, Ast.Environment[]> {
    const ret: Map<string, Ast.Environment[]> = new Map();
    walkAst(
        ast,
        (node) => {
            const name = printRaw(node.env);
            let newVal = ret.get(name) || [];
            newVal.push(node);
            ret.set(name, newVal);
            return node;
        },
        match.anyEnvironment
    );

    return ret;
}

type IncludedPackage = {
    name: string;
    args?: Ast.Argument;
};

/**
 * Get a list of all packages directly imported into the file. This can
 * be done with `usepackage` or `RequirePackage`. Packages are returned
 * in order with the exception that all `RequirePackage` imports are before
 * all `usepackage` imports.
 *
 * Duplicates may appear if a package has been imported multiple times.
 *
 */
export function getIncludedPackages(ast: Ast.Ast): IncludedPackage[] {
    const macros = allMacros(ast);
    const includePackage = macros.get("usepackage") || [];
    const requirePackage = macros.get("RequirePackage") || [];

    const ret: IncludedPackage[] = [];
    function addPackageIfNeeded(pack: Ast.Macro) {
        if (!pack.args) {
            return;
        }
        // The includes are always the last arg
        const includeArgs = pack.args[pack.args.length - 1];
        const optionalArgs =
            pack.args.length > 1
                ? pack.args.find((arg) => arg.openMark === "[")
                : null;
        for (const includeItem of parsePgfkeys(includeArgs.content)) {
            if (!includeItem.itemParts || includeItem.itemParts.length === 0) {
                // They included two commas without an import...
                continue;
            }
            const included: IncludedPackage = {
                name: printRaw(includeItem.itemParts[0]),
            };
            if (optionalArgs) {
                included.args = optionalArgs;
            }
            ret.push(included);
        }
    }
    requirePackage.forEach(addPackageIfNeeded);
    includePackage.forEach(addPackageIfNeeded);

    return ret;
}

interface NewCommandSpec {
    name: string;
    signature: string;
    substitution: Ast.Ast;
    str: string;
}

/**
 * Returns a list of all commands that have been defined in `ast` via
 * the many, many ways to define a command.
 *
 * A typical example would be
 * ```
 * \newcommand{\foo}[2]{\bar{#1}{#2}}
 * ```
 */
export function getNewCommands(ast: Ast.Ast): NewCommandSpec[] {
    const macros = allMacros(ast);
    const potentialCommands = [
        ...(macros.get("newcommand") || []),
        ...(macros.get("renewcommand") || []),
        ...(macros.get("providecommand") || []),
        ...(macros.get("NewDocumentCommand") || []),
        ...(macros.get("RenewDocumentCommand") || []),
        ...(macros.get("ProvideDocumentCommand") || []),
        ...(macros.get("DeclareDocumentCommand") || []),
        ...(macros.get("NewExpandableDocumentCommand") || []),
        ...(macros.get("RenewExpandableDocumentCommand") || []),
        ...(macros.get("ProvideExpandableDocumentCommand") || []),
        ...(macros.get("DeclareExpandableDocumentCommand") || []),
    ];

    return potentialCommands.map((macro) => ({
        name: newcommandMacroToName(macro),
        signature: newcommandMacroToSpec(macro),
        substitution: newcommandMacroToSubstitutionAst(macro),
        str: printRaw(newcommandMacroToSubstitutionAst(macro)),
    }));
}

/**
 * Expands macros in `ast` as specified by `macros`.
 * Each macro in `macros` should provide the substitution AST (i.e., the AST with the #1, etc.
 * in it). This function assumes that the appropriate arguments have already been attached
 * to each macro specified. If the macro doesn't have it's arguments attached, its
 * contents will be wholesale replaced with its substitution AST.
 *
 * @export
 * @param {Ast.Ast} ast
 * @param {Record<string, Ast.Ast>} macros
 * @returns {Ast.Ast}
 */
export function expandMacros(
    ast: Ast.Ast,
    macros: { name: string; substitution: Ast.Ast }[]
): Ast.Ast {
    const expanderCache = new Map(
        macros.map((spec) => [
            spec.name,
            createMacroExpander(spec.substitution),
        ])
    );
    let ret = walkAst(
        ast,
        (node) => {
            const macroName = node.content;
            const expander = expanderCache.get(macroName);
            if (!expander) {
                return node;
            }
            // This type might be incompatible! We take care to flatten the tree before returning it.
            return expander(node) as any;
        },
        match.anyMacro
    );
    // After our substitutions, an array might have ended up where it shouldn't have.
    // Make sure to all the arrays before returning.
    ret = walkAst(ret, (array) => array.flat(), Array.isArray);

    return ret;
}

/**
 * Turn all ligatures into their unicode equivalent. For example,
 * `---` -> an em-dash and `\^o` to `ô`. This only applies in non-math mode,
 * since programs like katex will process math ligatures.
 */
export function expandUnicodeLigatures(ast: Ast.Ast): Ast.Ast {
    return walkAst(
        ast,
        (nodes) => parseLigatures(nodes),
        ((node: any, context: MatcherContext) =>
            Array.isArray(node) &&
            context?.inMathMode === false) as Ast.TypeGuard<Ast.Node[]>
    );
}

/**
 * Generate a macro that will render like an HTML tag. E.g.,
 * ```
 * <tag>...arg[0]...</tag>
 * ```
 *
 */
export function tagLikeMacro({
    tag,
    attributes,
    content,
}: {
    tag: string;
    attributes?: Record<string, string>;
    content?: Ast.Node[];
}): Ast.Macro {
    // We achieve this effect by creating a macro with an "argument"
    // whose open and close braces are the HTML tags.
    const ret: Ast.Macro = { type: "macro", content: "", escapeToken: "" };
    let openMark = `<${tag}>`;
    if (attributes && Object.keys(attributes).length > 0) {
        openMark = `<${tag} ${Object.entries(attributes)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ")}>`;
    }
    let closeMark = `</${tag}>`;
    if (!content) {
        // If there is no content this is an empty tag, so the close brace should be
        // empty and the open brace should close itself.
        openMark = openMark.slice(0, openMark.length - 1) + " />";
        closeMark = "";
        ret.args = [{ type: "argument", openMark, closeMark, content: [] }];
    } else {
        ret.args = [{ type: "argument", openMark, closeMark, content }];
    }

    return ret;
}

export function pgfkeysArgToObject(
    arg: Ast.Argument | Ast.Node[]
): Record<string, Ast.Node[]> {
    function parseFront(nodes: Ast.Node[]): string {
        return printRaw(nodes);
    }
    function parseBack(nodes: Ast.Node[] | undefined): Ast.Node[] {
        if (!nodes) {
            return [];
        }
        // If the only element is a group, we unwrap it
        if (nodes.length === 1 && match.group(nodes[0])) {
            return nodes[0].content;
        }
        return nodes;
    }

    let nodeList: Ast.Node[];
    if (match.argument(arg)) {
        nodeList = arg.content;
    } else {
        nodeList = arg;
    }
    const parsedArgs = parsePgfkeys(nodeList);
    return Object.fromEntries(
        parsedArgs
            .filter((part) => part.itemParts)
            .map((part) => [
                parseFront(part.itemParts![0]),
                parseBack(part.itemParts![1]),
            ])
    );
}

const ast = {
    trimEnvironmentContents,
    trim,
    walkAst,
    replaceNode,
    processEnvironment,
    parsePgfkeys,
    attachMacroArgs,
};

export const fixAllLints = applyAll;

export {
    createMacroExpander,
    ast,
    match,
    walkAst,
    parseLigatures,
    lints,
    lintAll,
    convertToHtml,
    xcolorColorToHex,
    xcolorMacroToHex,
};
