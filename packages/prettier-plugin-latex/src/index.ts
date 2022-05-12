import { prettierPluginLatex } from "unified-latex/unified-latex-prettier";

const options = {};
const defaultOptions = { useTabs: true };

export default { ...prettierPluginLatex, options, defaultOptions };
