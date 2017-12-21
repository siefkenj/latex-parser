# latex-parser
Generate an AST and beautify LaTeX code

*latex-parser* parses a typical LaTeX document and
then pretty-prints it. Though *parsing* LaTeX isn't possible
since it effectively has no grammar, *latex-parser* makes some
practical assumptions.

## How it works

*latex-parser* uses PEG.js to define a PEG grammar for LaTeX.
LaTeX source is first parsed with this grammar. Then it is post-processed
based on knowledge of special macros. (e.g., some macros are known to take
an argument, like `\mathbb`. Such arguments are not detected in the PEG
processing stage).

## Development

`node.js` and `npm` are used to package and bundle *latex-parser*.
To build the `playground`, run

	npm install
	npm run playground

for development, you can run

	webpack --watch

to automatically rebuild files as they change.

## Related Projects

  * Some code was borrowed from Michael Brade's `LaTeX.js` project https://github.com/michael-brade/LaTeX.js
  * Prettier is a code-formatting library https://prettier.io/

