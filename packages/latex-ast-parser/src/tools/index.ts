import { unified } from "unified";
import { VFile } from "vfile";
import rehypeStringify from "rehype-stringify";
import {
    attachMacroArgs,
    match,
    processEnvironment,
    replaceNode,
    trim,
    walkAst,
} from "../libs/ast";
import * as Ast from "@unified-latex/unified-latex-types";
import { argContentsFromMacro } from "../libs/ast/arguments";
import { trimEnvironmentContents } from "../libs/macro-utils";
import { structuredClone } from "@unified-latex/structured-clone";
import {
    xcolorColorToHex,
    xcolorMacroToHex,
} from "@unified-latex/unified-latex-ctan/package/xcolor";
import { parseLigatures } from "@unified-latex/unified-latex-util-ligatures";
import { expandMacros as unifiedExpandMacros } from "@unified-latex/unified-latex-util-macros";
import { splitStringsIntoSingleChars } from "@unified-latex/unified-latex-util-pegjs";
import {
    parsePgfkeys,
    pgfkeysArgToObject,
} from "@unified-latex/unified-latex-util-pgfkeys";
import { printRaw } from "@unified-latex/unified-latex-util-print-raw";
import { VisitorContext } from "@unified-latex/unified-latex-util-visit";
import {
    createMacroExpander,
    newcommandMacroToName,
    newcommandMacroToSpec,
    newcommandMacroToSubstitutionAst,
} from "./newcommand";
import {
    unifiedLatexToHast,
    wrapPars,
    KATEX_SUPPORT,
} from "@unified-latex/unified-latex-to-hast";
import { deleteComments } from "@unified-latex/unified-latex-util-comments";
import { replaceStreamingCommand as unifiedReplaceStreamingCommand } from "@unified-latex/unified-latex-util-replace";
import { lints } from "@unified-latex/unified-latex-lint";

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

export interface NewCommandSpec {
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
 */
export function expandMacros(
    ast: Ast.Ast,
    macros: { name: string; substitution: Ast.Node[] }[]
): Ast.Ast {
    ast = structuredClone(ast);
    const formattedMacros = macros.map((m) => ({
        name: m.name,
        body: m.substitution,
    }));
    unifiedExpandMacros(ast, formattedMacros);
    return ast;
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
        ((node: any, context: VisitorContext) =>
            Array.isArray(node) &&
            context.inMathMode === false &&
            context.hasMathModeAncestor !== true) as Ast.TypeGuard<Ast.Node[]>
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

export { pgfkeysArgToObject };

/**
 * Use a heuristic to decide whether a string was parsed in math mode. The heuristic
 * looks for strings of length greater than 1 or the failure for "_" and "^" to be parsed
 * as a macro.
 */
export function wasParsedInMathMode(nodes: Ast.Node[]): boolean {
    return !nodes.some(
        (node) =>
            // If there are multi-char strings or ^ and _ have been parsed as strings, we know
            // that we were not parsed in math mode.
            (match.anyString(node) && node.content.length > 1) ||
            match.string(node, "^") ||
            match.string(node, "_")
    );
}

function ensureRoot(ast: Ast.Node | Ast.Node[]): Ast.Root {
    if (Array.isArray(ast)) {
        return { type: "root", content: ast };
    } else if (ast.type === "root") {
        return ast;
    } else {
        return { type: "root", content: [ast] };
    }
}

/**
 * Convert a latex AST to an HTML string.
 */
function convertToHtml(ast: Ast.Node | Ast.Node[]): string {
    let root = ensureRoot(ast);
    const processed = unified().use(unifiedLatexToHast).runSync(root);
    return unified().use(rehypeStringify).stringify(processed);
}

export { splitStringsIntoSingleChars };

const ast = {
    trimEnvironmentContents,
    trim,
    walkAst,
    replaceNode,
    processEnvironment,
    parsePgfkeys,
    attachMacroArgs,
    deleteComments,
};
export const html = {
    convertToHtml,
    wrapPars,
    tagLikeMacro,
};

export const fixAllLints = <T extends Ast.Node | Ast.Node[]>(tree: T): T => {
    let root = ensureRoot(tree);
    let processor = unified();
    for (const lint of Object.values(lints)) {
        processor = processor.use(lint as any, { fix: true });
    }
    const ret: Ast.Root = processor.runSync(root) as any;
    // We'd like to return the same type of node that we received.
    if (Array.isArray(tree)) {
        return ret.content as any;
    }
    if (tree.type === "root") {
        return ret as any;
    }
    return ret.content[0] as any;
};

/**
 * Run all lints and report the errors
 *
 * @param {(Ast.Node | Ast.Node[])} tree
 * @returns
 */
const lintAll = (tree: Ast.Node | Ast.Node[]) => {
    tree = ensureRoot(tree);
    let file = new VFile();
    let processor = unified();
    for (const lint of Object.values(lints)) {
        processor = processor.use(lint as any);
    }
    processor.runSync(tree, file);
    return file.messages.map((m) => m.reason);
};

/**
 * Given a group or a node array, look for streaming commands (e.g., `\bfseries`) and replace them
 * with the specified macro. The "arguments" of the streaming command are passed to `replacements[macroName](...)`.
 * By default, this command will split at parbreaks (since commands like `\textbf{...} do not accept parbreaks in their
 * contents).
 */
function replaceStreamingCommand(
    ast: Ast.Group | Ast.Node[],
    replacements: Record<
        string,
        (content: Ast.Node[], origMacro: Ast.Macro) => Ast.Node | Ast.Node[]
    >
) {
    const isStreamingCommand = match.createMacroMatcher(replacements);
    const replacer = (content: Ast.Node[], origMacro: Ast.Macro) => {
        return replacements[origMacro.content](content, origMacro);
    };
    ast = structuredClone(ast);
    return unifiedReplaceStreamingCommand(ast, isStreamingCommand, replacer);
}

export {
    createMacroExpander,
    argContentsFromMacro,
    ast,
    match,
    walkAst,
    parseLigatures,
    lintAll,
    lints,
    convertToHtml,
    xcolorColorToHex,
    xcolorMacroToHex,
    replaceStreamingCommand,
    KATEX_SUPPORT,
};
