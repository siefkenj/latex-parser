# latex-ast-parser

Generate an AST and beautify LaTeX code

**Note**: You should use [`unified-latex`](https://github.com/siefkenj/unified-latex) and the `unifiedjs`
infrastructure if you want to do serious AST manipulations. 
This library is a legacy wrapper around some basic functions in `unified-latex`.

_latex-parser_ parses a typical LaTeX document and
then pretty-prints it. Though _parsing_ LaTeX isn't possible
since it effectively has no grammar, _latex-parser_ makes some
practical assumptions.

## How it works

_latex-parser_ uses PEG.js to define a PEG grammar for LaTeX.
LaTeX source is first parsed with this grammar. Then it is post-processed
based on knowledge of special macros. (e.g., some macros are known to take
an argument, like `\mathbb`. Such arguments are not detected in the PEG
processing stage).

## Development

`node.js` and `npm` are used to package and bundle _latex-parser_.

    npm install
    npm run build

for development, you can run

    webpack --watch

to automatically rebuild files as they change.

## Playground

You use the [Playground](https://siefkenj.github.io/latex-parser-playground) to view
how latex is parsed/pretty-printed. To run your own version, visit the [playground repository](https://github.com/siefkenj/latex-parser-playground),
and make a local clone. After running `npm install`, run `npm link` in your local `latex-parser` repository. Then, run `npm link latex-ast-parser`
in the local playground repository. This will mirror your development version of latex-parser in the playground.

## Related Projects

-   [`unified-latex`](https://github.com/siefkenj/unified-latex) the backend for this project.
-   Some code was borrowed from Michael Brade's `LaTeX.js` project https://github.com/michael-brade/LaTeX.js
-   Prettier is a code-formatting library https://prettier.io/
