import Prettier from "prettier/standalone";
import * as prettierPluginLatex from "./prettier-plugin-latex";
import { parse, printRaw } from "./libs/parser";

/**
 * Format `source` LaTeX code using Prettier to format/render
 * the code.
 *
 * @export
 * @param {string} [source=""] - code to be formatted
 * @param {*} [options={}] - Prettier options object (you can set `printWidth` here)
 * @returns {string} formatted code
 */
function printPrettier(source = "", options = {}) {
    return Prettier.format(source, {
        printWidth: 80,
        useTabs: true,
        tabWidth: 4,
        ...options,
        parser: "latex-parser",
        plugins: [prettierPluginLatex],
    });
}

export { parse, printRaw, printPrettier, prettierPluginLatex, Prettier };
