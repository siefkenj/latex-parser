// https://github.com/prettier/prettier/blob/master/src/doc/index.js
export type Doc =
    | string
    | Align
    | BreakParent
    | Concat
    | Fill
    | Group
    | IfBreak
    | Indent
    | Line
    | LineSuffix
    | LineSuffixBoundary;

interface Align {
    type: "align";
    contents: Doc;
    n: number | string | { type: "root" };
}

interface BreakParent {
    type: "break-parent";
}

interface Concat {
    type: "concat";
    parts: Doc[];
}

interface Fill {
    type: "fill";
    parts: Doc[];
}

interface Group {
    type: "group";
    contents: Doc;
    break: boolean;
    expandedStates: Doc[];
}

interface IfBreak {
    type: "if-break";
    breakContents: Doc;
    flatContents: Doc;
}

interface Indent {
    type: "indent";
    contents: Doc;
}

interface Line {
    type: "line";
    soft?: boolean;
    hard?: boolean;
    literal?: boolean;
}

interface LineSuffix {
    type: "line-suffix";
    contents: Doc;
}

interface LineSuffixBoundary {
    type: "line-suffix-boundary";
}

export interface doc {
    builders: {
        addAlignmentToDoc: (doc: Doc, size: number, tabWidth: number) => Doc;
        align: (n: Align["n"], contents: Doc) => Align;
        breakParent: BreakParent;
        concat(contents: Doc[]): Concat;
        conditionalGroup(states: Doc[], opts?: { shouldBreak: boolean }): Group;
        dedent(contents: Doc): Align;
        dedentToRoot(contents: Doc): Align;
        fill(parts: Doc[]): Fill;
        group(contents: Doc, opts?: { shouldBreak: boolean }): Group;
        hardline: Concat;
        ifBreak(breakContents: Doc, flatContents: Doc): IfBreak;
        indent(contents: Doc): Indent;
        join(separator: Doc, parts: Doc[]): Concat;
        line: Line;
        lineSuffix(contents: Doc): LineSuffix;
        lineSuffixBoundary: LineSuffixBoundary;
        literalline: Concat;
        markAsRoot(contents: Doc): Align;
        softline: Line;
    };
}

// https://github.com/prettier/prettier/blob/master/src/common/fast-path.js
export interface FastPath<T = any> {
    stack: any[];
    getName(): null | PropertyKey;
    getValue(): T;
    getNode(count?: number): null | T;
    getParentNode(count?: number): null | T;
    call<U>(callback: (path: this) => U, ...names: PropertyKey[]): U;
    each(callback: (path: this) => void, ...names: PropertyKey[]): void;
    map<U>(callback: (path: this, index: number) => U, ...names: PropertyKey[]): U[];
}

export interface PrintFunc {
    (path: FastPath, options: ParserOptions, print: (path: FastPath) => Doc): Doc
}

export interface RecursivePrintFunc<U = any> {
    (path: U, index?: number): Doc
}

export interface Options extends Partial<RequiredOptions> {}
export interface RequiredOptions extends Options {
    /**
     * Print semicolons at the ends of statements.
     * @default true
     */
    semi: boolean;
    /**
     * Use single quotes instead of double quotes.
     * @default false
     */
    singleQuote: boolean;
    /**
     * Use single quotes in JSX.
     * @default false
     */
    jsxSingleQuote: boolean;
    /**
     * Print trailing commas wherever possible.
     * @default 'es5'
     */
    trailingComma: 'none' | 'es5' | 'all';
    /**
     * Print spaces between brackets in object literals.
     * @default true
     */
    bracketSpacing: boolean;
    /**
     * Put the `>` of a multi-line JSX element at the end of the last line instead of being alone on the next line.
     * @default false
     */
    jsxBracketSameLine: boolean;
    /**
     * Format only a segment of a file.
     * @default 0
     */
    rangeStart: number;
    /**
     * Format only a segment of a file.
     * @default Infinity
     */
    rangeEnd: number;
    /**
     * Specify which parser to use.
     */
    parser: any;
    /**
     * Specify the input filepath. This will be used to do parser inference.
     */
    filepath: string;
    /**
     * Prettier can restrict itself to only format files that contain a special comment, called a pragma, at the top of the file.
     * This is very useful when gradually transitioning large, unformatted codebases to prettier.
     * @default false
     */
    requirePragma: boolean;
    /**
     * Prettier can insert a special @format marker at the top of files specifying that
     * the file has been formatted with prettier. This works well when used in tandem with
     * the --require-pragma option. If there is already a docblock at the top of
     * the file then this option will add a newline to it with the @format marker.
     * @default false
     */
    insertPragma: boolean;
    /**
     * By default, Prettier will wrap markdown text as-is since some services use a linebreak-sensitive renderer.
     * In some cases you may want to rely on editor/viewer soft wrapping instead, so this option allows you to opt out.
     * @default 'preserve'
     */
    proseWrap: 'always' | 'never' | 'preserve';
    /**
     * Include parentheses around a sole arrow function parameter.
     * @default 'always'
     */
    arrowParens: 'avoid' | 'always';
    /**
     * The plugin API is in a beta state.
     */
    plugins: Array<string | Plugin>;
    /**
     * How to handle whitespaces in HTML.
     * @default 'css'
     */
    htmlWhitespaceSensitivity: 'css' | 'strict' | 'ignore';
    /**
     * Which end of line characters to apply.
     * @default 'lf'
     */
    endOfLine: 'auto' | 'lf' | 'crlf' | 'cr';
    /**
     * Change when properties in objects are quoted.
     * @default 'as-needed'
     */
    quoteProps: 'as-needed' | 'consistent' | 'preserve';
    /**
     * Whether or not to indent the code inside <script> and <style> tags in Vue files.
     * @default false
     */
    vueIndentScriptAndStyle: boolean;
}

export interface ParserOptions extends RequiredOptions {
    locStart: (node: any) => number;
    locEnd: (node: any) => number;
    originalText: string;
}