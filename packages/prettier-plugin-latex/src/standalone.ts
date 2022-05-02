import Prettier from "prettier/standalone";
import prettierPluginLatex from ".";
import { parse, parseMath } from "unified-latex/unified-latex-util-parse";
import { printRaw } from "unified-latex/unified-latex-util-print-raw";
import { Options } from "prettier";

/**
 * Print `text` using the LaTeX Prettier plugin.
 */
export function prettyPrint(text: string, options?: Options): string {
    return Prettier.format(text, {
        parser: "latex-parser",
        plugins: [prettierPluginLatex],
        ...(options || {}),
    });
}

export { parse, parseMath, printRaw, prettierPluginLatex };
