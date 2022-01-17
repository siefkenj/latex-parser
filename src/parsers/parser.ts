import { LatexPegParser as PegParser } from "./pegjs-parsers";
import {
    cleanEnumerateBody,
    trim,
    trimEnvironmentContents,
    match,
} from "../libs/macro-utils";
import { attachMacroArgs, walkAst } from "../libs/ast";
import * as xparseLibs from "../package-specific-macros/xparse";
import * as latex2eLibs from "../package-specific-macros/latex2e";
import * as mathtoolsLibs from "../package-specific-macros/mathtools";
import * as hyperrefLibs from "../package-specific-macros/hyperref";
import * as xcolorLibs from "../package-specific-macros/xcolor";
import * as systemeLibs from "../package-specific-macros/systeme";
import * as Ast from "../libs/ast-types";

import { printRaw } from "../libs/print-raw";
import {
    SpecialEnvSpec,
    SpecialMacroSpec,
} from "../package-specific-macros/types";
import { processEnvironments } from "../libs/ast/environments";
import { wasParsedInMathMode } from "../tools";

const LIB_SPECIAL_MACROS: SpecialMacroSpec = {};
const LIB_SPECIAL_ENVS: SpecialEnvSpec = {};
Object.assign(
    LIB_SPECIAL_MACROS,
    latex2eLibs.macros,
    xparseLibs.macros,
    mathtoolsLibs.macros,
    hyperrefLibs.macros,
    xcolorLibs.macros,
    systemeLibs.macros
);
Object.assign(
    LIB_SPECIAL_ENVS,
    latex2eLibs.environments,
    xparseLibs.environments,
    mathtoolsLibs.environments,
    hyperrefLibs.environments,
    xcolorLibs.environments,
    systemeLibs.environments
);

// A list of macros to be specially treated. The argument signature
// for these macros is given in the `xparse` syntax.
const SPECIAL_MACROS: SpecialMacroSpec = {
    textlf: { signature: "m", renderInfo: { inParMode: true } },
    // Preamble macros
    RequirePackage: { signature: "o m", renderInfo: { pgfkeysArgs: true } },
    // \newcommand arg signature from https://www.texdev.net/2020/08/19/the-good-the-bad-and-the-ugly-creating-document-commands
    DeclareOption: { signature: "m m" },
    geometry: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    // LaTeX commands
    setlength: { signature: "m m", renderInfo: { breakAround: true } },
    ref: { signature: "s m" },
    cref: { signature: "s m" },
    cpageref: { signature: "s m" },
    label: { signature: "m" },
    printbibliography: { renderInfo: { breakAround: true } },
    addtocontents: { signature: "m m", renderInfo: { breakAround: true } },
    addcontentsline: { signature: "m m m", renderInfo: { breakAround: true } },
    contentsline: { signature: "m m m", renderInfo: { breakAround: true } },
    bibliography: { signature: "m", renderInfo: { breakAround: true } },
    bibliographystyle: { signature: "m", renderInfo: { breakAround: true } },
    caption: { signature: "m", renderInfo: { breakAround: true } },
    // Tikz
    pgfkeys: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    tikzoption: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    tikzstyle: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    usetikzlibrary: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    pgfplotsset: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    pgfplotstabletypeset: {
        signature: "o m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    // nicematrix
    NiceMatrixOptions: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    mymacro: {
        signature: "o m o",
    },
};
const SPECIAL_ENVIRONMENTS: SpecialEnvSpec = {
    index: { signature: "o m" },
    // Enumerate environments
    // XXX TODO, clean up these types
    parts: { signature: "o", processContent: cleanEnumerateBody as any },
    // Aligned environments
    tabularx: { signature: "m m", renderInfo: { alignContent: true } },
    // Math environments
    displaymath: { renderInfo: { inMathMode: true } },
    // Typical amsthm environments
    theorem: { signature: "o" },
    lemma: { signature: "o" },
    definition: { signature: "o" },
    proposition: { signature: "o" },
    corollary: { signature: "o" },
    remark: { signature: "!o" },
    example: { signature: "!o" },
    // TikZ
    tikzpicture: { signature: "o", renderInfo: { pgfkeysArgs: true } },
    axis: { signature: "o", renderInfo: { pgfkeysArgs: true } },
    // nicematrix
    NiceTabular: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceMatrixBlock: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceArrayWithDelims: {
        signature: "m m o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    pNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    bNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    BNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    vNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    VNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    pNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    bNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    BNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    vNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    VNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
};

/**
 * A special environment is one that is listed in `SPECIAL_ENVIRONMENTS`,
 * which includes additional annotations and processing functions.
 *
 * @param {*} ast
 * @returns
 */
function processSpecialEnvironments<T extends Ast.Ast>(
    ast: T,
    specialEnvironments = SPECIAL_ENVIRONMENTS
): T {
    return processEnvironments(ast, specialEnvironments);
}

/**
 * Look for any special macros, grab their arguments, and
 * put them in the `.args` property.
 *
 * @param {*} ast
 * @returns
 */
function attachSpecialMacroArgs<T extends Ast.Ast>(
    ast: T,
    specialMacros = SPECIAL_MACROS
): T {
    ast = attachMacroArgs(ast, specialMacros);

    return ast;
}

/**
 * Recursively wraps all strings in the AST node in
 * a { type: "string", content: <original string> }
 * object.
 *
 * @param {*} node
 */
function wrapStrings<T extends Ast.Ast | string>(
    node: T
): T extends string ? Ast.String : T {
    if (node == null) {
        return node;
    }
    if (typeof node === "string") {
        return { type: "string", content: node } as any;
    }
    if (Array.isArray(node)) {
        return node.map(wrapStrings) as any;
    }
    // At this point, `node` must be an object
    // wrap strings that appear in children

    // We don't want the `content` of a type == macro
    // node to be wrapped, but wrap everything else
    let childProps = ["content", "args", "env"];
    switch (node.type) {
        case "macro":
            childProps = ["args"];
            break;
        case "comment":
        case "string":
        case "verb":
        case "verbatim":
            childProps = [];
            break;
        default:
            break;
    }

    const ret: Ast.Node | Ast.Argument = { ...node };
    for (const prop of childProps) {
        if (prop in ret) {
            (ret as any)[prop] = wrapStrings((ret as any)[prop]);
        }
    }

    return ret as any;
}

for (const key in SPECIAL_MACROS) {
    if (key in LIB_SPECIAL_MACROS) {
        console.log(
            "Duplicate definition of macro",
            key,
            SPECIAL_MACROS[key],
            LIB_SPECIAL_MACROS[key]
        );
    }
}
for (const key in SPECIAL_ENVIRONMENTS) {
    if (key in LIB_SPECIAL_ENVS) {
        console.log(
            "Duplicate definition of environment",
            key,
            SPECIAL_ENVIRONMENTS[key],
            LIB_SPECIAL_ENVS[key]
        );
    }
}

/**
 * Return the known special macros and environments. These macros and environments are combined with
 * those listed in `options`.
 */
function getSpecialMacrosAndEnvironments(options?: {
    macros?: SpecialMacroSpec;
    environments?: SpecialEnvSpec;
}) {
    const specialMacros: SpecialMacroSpec = {
        ...SPECIAL_MACROS,
        ...LIB_SPECIAL_MACROS,
    };
    const specialEnvironments: SpecialEnvSpec = {
        ...SPECIAL_ENVIRONMENTS,
        ...LIB_SPECIAL_ENVS,
    };
    // Combine the special macros/environments with the passed in ones
    if (options) {
        const { macros, environments } = options;
        Object.assign(specialMacros, macros);
        Object.assign(specialEnvironments, environments);
    }

    return { macros: specialMacros, environments: specialEnvironments };
}

/**
 * Attach arguments to macros an environments and process their body as appropriate.
 */
function processMacrosAndEnvironments<T extends Ast.Ast>(
    ast: T,
    options?: { macros?: SpecialMacroSpec; environments?: SpecialEnvSpec }
): T {
    const { macros: specialMacros, environments: specialEnvironments } =
        getSpecialMacrosAndEnvironments(options);

    ast = attachSpecialMacroArgs(ast, specialMacros);
    ast = processSpecialEnvironments(ast, specialEnvironments);
    return ast;
}

/**
 * Parse the LeTeX string to an AST assuming that the contents
 * should be parsed in math mode. This method always returns an array (not a "root" element).
 *
 * @param {string} [str=""] - LaTeX string input
 * @returns - AST for LaTeX string
 */
export function parseMath(
    input: string | Ast.Ast,
    options?: { macros?: SpecialMacroSpec; environments?: SpecialEnvSpec }
) {
    const str = typeof input === "string" ? input : printRaw(input);
    const pegAst: Ast.Node[] = PegParser.parse(str, {
        startRule: "math",
    });
    let ast = wrapStrings(pegAst);
    ast = processMacrosAndEnvironments(ast, options);
    return ast;
}

/**
 * Parse the LeTeX string to an AST.
 *
 * @param {string} [str=""] - LaTeX string input
 * @returns - AST for LaTeX string
 */
export function parse(
    str = "",
    options?: { macros?: SpecialMacroSpec; environments?: SpecialEnvSpec }
) {
    const pegAst: Ast.Root = PegParser.parse(str);
    let ast = wrapStrings(pegAst);
    ast = processMacrosAndEnvironments(ast, options);
    // Now that arguments have been attached to environments and macros, we may need
    // to re-parse the contents of some environments/macro args in math mode
    const { macros: specialMacros, environments: specialEnvironments } =
        getSpecialMacrosAndEnvironments(options);

    const mathEnvironments = Object.fromEntries(
        Object.entries(specialEnvironments).filter(
            ([_, spec]) => spec.renderInfo?.inMathMode === true
        )
    );
    const mathEnvMatcher = match.createEnvironmentMatcher(mathEnvironments);
    ast = walkAst(
        ast,
        (node) => {
            // If we're here, we've matched an environment with contents that should
            // be parsed in math mode. We may need to re-parse the contents.
            if (!wasParsedInMathMode(node.content)) {
                return { ...node, content: parseMath(node.content) };
            }

            return node;
        },
        mathEnvMatcher
    ) as Ast.Root;
    const mathMacros = Object.fromEntries(
        Object.entries(specialMacros).filter(
            ([_, spec]) => spec.renderInfo?.inMathMode === true
        )
    );
    const mathMacroMatcher = match.createMacroMatcher(mathMacros);
    ast = walkAst(
        ast,
        (node) => {
            if (!node.args) {
                return node;
            }
            let didProcess = false;
            const args = node.args.map((arg) => {
                if (
                    arg.content.length > 0 &&
                    !wasParsedInMathMode(arg.content)
                ) {
                    didProcess = true;
                    return { ...arg, content: parseMath(arg.content) };
                }
                return arg;
            });
            if (!didProcess) {
                return node;
            }

            return { ...node, args };
        },
        mathMacroMatcher
    ) as Ast.Root;

    ast.content = trim((ast as Ast.Root).content);
    ast = trimEnvironmentContents(ast);
    return ast;
}

export { printRaw };
