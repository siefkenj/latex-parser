# prettier-plugin-latex

A prettier plugin for formatting LaTeX documents. You can try it out online in the [playground](https://siefkenj.github.io/latex-parser-playground/)

## Intro

Prettier is an opinionated code formatter. It enforces a consistent style by parsing your code and re-printing it with its own rules that take the maximum line length into account, wrapping code when necessary.

This plugin adds support for the LaTex to Prettier. While TeX itself cannot be parsed without being executed, `prettier-plugin-latex` makes the assumption that your document uses "standard" LaTeX, and parses it to the best of its ability.

### Input

```latex
\begin{enumerate}
    \item[55,4] Hi there
\item$e^2$ is math mode! \[\begin{matrix}12&3^e\\pi&0\end{matrix}\]
\end{enumerate}
```

### Output

```latex
\begin{enumerate}
	\item[55,4] Hi there

	\item $e^{2}$ is math mode!
		\[
			\begin{matrix}
				12 & 3^e \\
				pi & 0
			\end{matrix}
		\]
\end{enumerate}
```

## Install

yarn:

```bash
yarn add --dev prettier prettier-plugin-latex
# or globally
yarn global add prettier prettier-plugin-latex
```

npm:

```bash
npm install --save-dev prettier prettier-plugin-latex
# or globally
npm install --global prettier prettier-plugin-latex
```

## Use

### With Node.js

If you installed prettier as a local dependency, you can add prettier as a
script in your `package.json`,

```json
{
    "scripts": {
        "prettier": "prettier"
    }
}
```

and then run it via

```bash
yarn run prettier path/to/file.tex --write
# or
npm run prettier path/to/file.tex --write
```

If you installed globally, run

```bash
prettier path/to/file.tex --write
```

### In the Browser

This package exposes a `standalone.js` that wraps prettier and exports a
`printPrettier` function that can be called as

```js
printPrettier(YOUR_CODE, {
    // example option
    tabWidth: 2,
});
```

## Options

The standard Prettier options (such as `tabWidth`) can be used.

## Development

To make a production build, run

```
npm run build
```

To develop, run

```
npm run watch
```

You can then execute Prettier with

```
prettier --plugin-search-dir=./ ...
```

or

```
prettier --plugin=./dist/prettier-plugin-latex.js ...
```

and the LaTeX plugin will load from the current directory.

**Note:** Prettier assumes that plugins are CommonJS modules with default exports. However,
Webpack does _not_ translate `export default ...` syntax into a CommonJS default export. For
this reason, the actual entry point to the plugin is `src/commonjs-export.cjs` which uses the
CommonJS format to re-export the plugin as a default CommonJS export.

### Code structure

`prettier-plugin-latex` uses the [unified-latex](https://github.com/siefkenj/latex-parser) library to parse the latex file and convert it to a prettier AST. This library is just a thin layer over `latex-ast-parser`
