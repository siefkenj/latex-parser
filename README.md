# latex-parser
Monorepo for `unified-latex`, `prettier-plugin-latex`, and friends, which are tools that
generate an AST for and beautify LaTeX code

Most of the action lies in the
  - `packages/unified-latex/`
directory, where you'll find plugins for [Unifiedjs](https://unifiedjs.com/) and standalone tools for parsing
LaTeX to an Abstract Syntax Tree (AST). Though *parsing* LaTeX isn't possible
since it effectively has no grammar, *unified-latex* makes some
practical assumptions. It should work on your code, unless you do complicated things like redefine control sequences
or embed complicated TeX-style macros.

## How it works

*unified-latex-util-parse* uses PEG.js to define a PEG grammar for LaTeX.
LaTeX source is first parsed with this grammar. Then it is post-processed
based on knowledge of special macros. (e.g., some macros are known to take
an argument, like `\mathbb`. Such arguments are not detected in the PEG
processing stage).

## Development

You should develop in each project's subfolder in the `packages/` directory.
These packages are set up as `npm` _workspaces_.

If you have `node.js` and `npm` installed, run
```
	npm install
```
in **this (the root)** directory. Then you may 
```
cd packages/unified-latex
npm install
npm run build
```

for development, you can run
```
npx webpack --watch
```
to automatically rebuild files as they change.

## Playground

You use the [Playground](https://siefkenj.github.io/latex-parser-playground) to view
how latex is parsed/pretty-printed. To run your own version, visit the [playground repository](https://github.com/siefkenj/latex-parser-playground),
and make a local clone. After running `npm install`, run `npm link` in your local `latex-parser` repository. Then, run `npm link latex-ast-parser`
in the local playground repository. This will mirror your development version of latex-parser in the playground.

## Related Projects

  * Some code was borrowed from Michael Brade's `LaTeX.js` project https://github.com/michael-brade/LaTeX.js
  * Prettier is a code-formatting library https://prettier.io/

