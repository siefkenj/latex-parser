# latex-ast-parser

**Note**: this project has been replaced by the [`unified-latex`](https://github.com/siefkenj/unified-latex) project.
It is only maintained for legacy purposes.

## Development

You should develop in each project's subfolder in the `packages/` directory.
These packages are set up as `npm` _workspaces_.

If you have `node.js` and `npm` installed, run
```
	npm install
```
in **this (the root)** directory. Then you may 
```
cd packages/latex-ast-parser
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

  * [`unified-latex`](https://github.com/siefkenj/unified-latex) the replacement framework for `latex-ast-parser` built on the [unified.js](https://unifiedjs.com/) framework.
  * Some code was borrowed from Michael Brade's `LaTeX.js` project https://github.com/michael-brade/LaTeX.js
  * Prettier is a code-formatting library https://prettier.io/

