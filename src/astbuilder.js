/*
 * walk through the PEG.js generated AST for the LaTeX document,
 * clean it up, and convert it to smarter classes
 */

"use strict";

// PEG.js parser
const latexpeg = require("./latexpeg.js");
// Bare minimum to be able to export a prettier.js doc tree for pretty-printing
const PRETTIER = require("./prettierutil.js");

const latexAst = require("./latex-ast.js")
const formatterTokens = require("./formatter-token.js")
const TOKENS = formatterTokens.tokens;

var {
        ASTNodeList,
        ASTNode,
        ContentOnlyNode,
        ArgsNode,
        Environment,
        Macro,
        Parbreak,
        Whitespace,
        Subscript,
        Superscript,
        InlineMath,
        DisplayMath,
        MathEnv,
        Group,
        Verbatim,
        Verb,
        CommentEnv,
        CommentNode,
        StringNode,
        ArgList,
    } = latexAst.nodeTypes;




const ESCAPE = "\\";

function type(x) {
    if (x === null) {
        return "null";
    }
    if (typeof x !== "object") {
        return typeof x;
    }
    if (Array.isArray(x)) {
        return "array";
    }
    return "object";
}

function splitOn(arr, tok) {
    // splits `arr` based on `tok`.
    // `tok` can be a string or an ASTNode
    // or an array of things to split on

    if (type(tok) === "array") {
        tok = tok.map(strToAST)
    } else {
        tok = [strToAST(tok)]
    }


    var ret = new ASTNodeList(), toks = new ASTNodeList();
    var tmp = new ASTNodeList();
    for (let i of arr) {
        for (let t of tok) {
            if (i.TYPE === t.TYPE && i.content === t.content) {
                toks.push(i);
                ret.push(tmp);
                tmp = new ASTNodeList();
            } else {
                tmp.push(i);
            }
        }
    }
    ret.push(tmp);
    console.log(ret, toks)
    return [ret, toks];
}

function joinOn(arr, toks) {
    // like arrayJoin, but this is the inverse
    // to splitOn; i.e., it takes an array
    // of inputs.
    if (type(toks) != "array") {
        return arrayJoin(arr, toks);
    }

    var ret = new ASTNodeList();
    for (let i of arr) {
        ret.push(i);
        let tok = toks.shift();
        if (typeof tok !== 'undefined') {
            ret.push(tok);
        }
    }
    return ret;
}

function arrayJoin(arr, tok) {
    // return a new array where `tok` is inserted
    // between each array entry
    var ret = new ASTNodeList();
    for (let i of arr) {
        ret.push(i);
        ret.push(tok);
    }
    ret.pop();
    return ret;
}

function transpose(arr) {
    // get the transpose of an array of arrays

    var copy = arr.map(x => {return [...x]})
    var transpose = []
    for (let i = 0; i < (arr[0] || []).length; i++) {
        let tmp = [];
        for (let r of copy) {
            let elm = r.shift()
            if (typeof elm !== "undefined") {
                tmp.push(elm);
            }
        }
        transpose.push(tmp);
    }

    return transpose;
}

function tabularToMatrix(arr, colSep, rowSep) {
    // get a list of lists containing the rows,
    // the columns, and the separators used

    var [rows, rowSeps] = splitOn(arr, rowSep);
    var mat = [], colSeps = [];
    for (let row of rows) {
        let [items, seps] = splitOn(row, colSep);
        items = items.map(trimWhitespace)
        mat.push(new ASTNodeList(...items));
        colSeps.push(seps);
    }

    var rendered = mat.map( x => {return x.map( y => {return ""+y})})

    var cols = transpose(rendered);
    var colWidths = cols.map( x => {return Math.max(...(x.map(y => {return y.length})))})

    return {
        rows: mat,
        rendered,
        colWidths,
        rowSeps,
        colSeps
    }
}

function padTable(rows, colWidths, rowSeps, colSeps, align="left", padColSep=true) {
    // take in a table and insert padding to align all elements

    function getSpace(len=1) {
        return new StringNode(" ".repeat(len))
    }
    // set the proper alignment function
    var alignFunc = (a, width) => { return new ASTNodeList(a, getSpace(width - (""+a).length)) }
    if (align === "right") {
        alignFunc = (a, width) => { return new ASTNodeList(getSpace(width - (""+a).length), a) }
    } else if (align === "center" || align === "middle") {
        alignFunc =  (a, width) => { 
            var padd = width - (""+a).length;
            var left = Math.floor(padd/2);
            var right = padd - left;
            return new ASTNodeList(getSpace(left), a, getSpace(right)) 
        }
    }

    // align the columns

    rows = rows.map(y => {return y.map((x, i) => {
        return alignFunc(x, colWidths[i])
    })});


    if (padColSep) {
        colSeps = colSeps.map(x => {return x.map(y => {return new ASTNodeList(getSpace(1), y, getSpace(1))})})
    }

    rows = rows.map((row, i) => {
        if (row.length === 0) {
            return new ASTNodeList();
        }
        var seps = [...(colSeps[i])];
        var ret = new ASTNodeList(row.shift())
        while (row.length > 0) {
            ret.push(seps.shift());
            ret.push(row.shift());
        }
        return ret;
    })

    //// add some newlines after the row separators
    //rowSeps = rowSeps.map(x => {return new ASTNodeList(x, new Whitespace())})

    // add the rowSeps to the end of each row
    rows.map( (x,i) => {if (typeof rowSeps[i] !== "undefined") {x.push(rowSeps[i])}})
    //var mat = joinOn(rows, rowSeps)
    return rows
}

return

/*
 * Classes for the AST types
 */

var ASTNodeList = class ASTNodeList extends Array {
    constructor() {
        super(...arguments);
        this.TYPE = "nodelist";
    }
    toString() {
        return this.join("");
    }
    toTokens() {
        return [].concat.apply([], this.map(x => x.toTokens()));
    }
    toPrettierDoc() {
        return PRETTIER.concat([
            PRETTIER.fill([].concat.apply([], this.map(x => x.toPrettierDoc())))
        ]);
    }
};

var ASTNode = class ASTNode {
    constructor(type = this.constructor.name.toLowerCase()) {
        this.TYPE = type;
    }
};

var ContentOnlyNode = class ContentOnlyNode extends ASTNode {
    constructor(content) {
        super();
        this.content = content;
    }
};

var ArgsNode = class ArgsNode extends ASTNode {
    // a node that has this.ags as a property
    constructor(args) {
        super();
        this.args = args;
    }
    get argsString() {
        if (typeof this.args !== "undefined") {
            return "[" + this.args + "]";
        }
        return "";
    }
    toTokens() {
        if (this.args) {
            return ["["].concat(this.args.toTokens()).concat("]");
        }
        return [];
    }
    toPrettierDoc() {
        if (this.args) {
            return PRETTIER.concat([
                PRETTIER.group(
                    PRETTIER.concat([
                        "[",
                        //PRETTIER.indent(
                        this.args.toPrettierDoc(),
                        //)
                        "]",
                        PRETTIER.softline
                    ])
                )
            ]);
        }
        return PRETTIER.concat([""]);
    }
};

var Environment = class Environment extends ArgsNode {
    constructor(env, args, content) {
        super(args);
        this.env = env;
        this.content = content;
    }

    toString() {
        // usually this.content will be an array, but for a verbatim environment
        // it will be string
        if (this.content.TYPE === "string") {
            return this.envStart + this.argsString + this.content + this.envEnd;
        }
        return (
            this.envStart +
            this.argsString +
            this.content.join("") +
            this.envEnd
        );
    }

    _processEnumerateEnvironment() {
        // enumerate environments have a list
        // of `\item`s followed by contents.
        // Find all of these so we can print them with
        // special rules
        // returns a list of lists that begins with each `\item`

        var items = [];
        var itemsText = new ASTNodeList();
        for (let i of this.content) {
            if (i.TYPE === "macro" && i.content === "item") {
                if (itemsText.length > 0) {
                    items.push(itemsText);
                    itemsText = new ASTNodeList();
                }
            }
            itemsText.push(i);
        }
        if (itemsText.length > 0) {
            items.push(itemsText);
        }

        return items.map(trimWhitespace);
    }

    _enumerateItemToPrettier(i) {
        var head = i[0];
        var rest = new ASTNodeList(i.slice(1));

        return PRETTIER.concat([
            head.toPrettierDoc(),
            PRETTIER.indent(rest.toPrettierDoc())
        ]);
    }

    get envStart() {
        return ESCAPE + "begin{" + this.env + "}";
    }
    get envEnd() {
        return ESCAPE + "end{" + this.env + "}";
    }
    toTokens() {
        return [].concat.call(
            [],
            [TOKENS.ensurenew, this.envStart, TOKENS.indent],
            super.toTokens(), // ArgsNode knows how to make arguments into tokens
            [TOKENS.newline],
            this.content.toTokens(),
            [TOKENS.endindent, TOKENS.newline, this.envEnd]
        );
    }
    toPrettierDoc() {
        switch (""+this.env) {
            case "parts":
            case "itemize":
            case "description":
            case "enumerate":
                var items = this._processEnumerateEnvironment()
                items = items.map(this._enumerateItemToPrettier)
                items = arrayJoin(items, PRETTIER.concat([PRETTIER.hardline, PRETTIER.hardline]))

                return PRETTIER.concat([
                    PRETTIER.hardline,
                    this.envStart,
                    super.toPrettierDoc(),
                    PRETTIER.indent(PRETTIER.concat([PRETTIER.hardline, ...items])),
                    PRETTIER.hardline,
                    this.envEnd
                ])
                break;
            case "align":
            case "align*":
            case "matrix":
            case "bmatrix":
            case "pmatrix":
            case "vmatrix":
            case "Bmatrix":
            case "Vmatrix":
            case "smallmatrix":
                var table = tabularToMatrix(this.content, "&", ["\\\\", "\\hline"])
                var formattedRows = padTable(table.rows, table.colWidths, table.rowSeps, table.colSeps)

                var docRows = formattedRows.map( x=> {return x.toPrettierDoc()})
                var doc = PRETTIER.concat(arrayJoin(docRows, PRETTIER.hardline))

                return PRETTIER.concat([
                    PRETTIER.hardline,
                    this.envStart,
                    super.toPrettierDoc(),
                    PRETTIER.indent(PRETTIER.group(PRETTIER.concat([PRETTIER.hardline, doc]))),
                    PRETTIER.hardline,
                    this.envEnd
                ])
                return PRETTIER.concat(ret)
                break;
        }

        return PRETTIER.concat([
            PRETTIER.hardline,
            this.envStart,
            super.toPrettierDoc(),
            PRETTIER.indent(
                PRETTIER.concat([
                    PRETTIER.hardline,
                    this.content.toPrettierDoc()
                ])
            ),
            PRETTIER.hardline,
            this.envEnd
        ]);
    }
};

var Macro = class Macro extends ArgsNode {
    constructor(name, args) {
        super(args);
        this.content = name;
    }
    toString() {
        return ESCAPE + this.content + this.argsString;
    }
    toTokens() {
        let start = [ESCAPE + this.content];
        // there are some special macros that
        // need special formatting
        switch (this.content) {
            case "usepackage":
            case "newcommand":
                start = [TOKENS.ensurenew].concat(start);
                break;
            case "item":
                start = [TOKENS.preferpar].concat(start);
                break;
        }
        return start.concat(super.toTokens());
    }
    toPrettierDoc() {
        let start = ESCAPE + this.content;
        // there are some special macros that
        // need special formatting
        switch (this.content) {
            case "usepackage":
            case "newcommand":
                return PRETTIER.concat([PRETTIER.hardline, start]);
                break;
            case "section":
            case "subsection":
            case "subsubsection":
                return PRETTIER.concat([PRETTIER.hardline, start]);
                break;
        }
        return start + this.argsString;
    }
};

var Parbreak = class Parbreak extends ASTNode {
    toString() {
        return "\n\n";
    }
    toTokens() {
        return [TOKENS.parbreak];
    }
    toPrettierDoc() {
        return PRETTIER.concat([PRETTIER.hardline, PRETTIER.hardline]);
    }
};

var Whitespace = class Whitespace extends ASTNode {
    toString() {
        return " ";
    }
    toTokens() {
        return [TOKENS.whitespace];
    }
    toPrettierDoc() {
        return PRETTIER.line;
    }
};

var Subscript = class Subscript extends ContentOnlyNode {
    toString() {
        return "_{" + this.content + "}";
    }
    toTokens() {
        if (this.content.TYPE === "group") {
            return [].concat.call([], ["_"], this.content.toTokens());
        }
        return [].concat.call([], ["_{"], this.content.toTokens(), ["}"]);
    }
    toPrettierDoc() {
        if (this.content.TYPE === "group") {
            return PRETTIER.concat(["_", this.content.toPrettierDoc()]);
        }
        return PRETTIER.concat(["_{", trimWhitespace(this.content).toPrettierDoc(), "}"]);
    }
};

var Superscript = class Superscript extends ContentOnlyNode {
    toString() {
        return "^{" + this.content + "}";
    }
    toTokens() {
        if (this.content.TYPE === "group") {
            return [].concat.call([], ["^"], this.content.toTokens());
        }
        return [].concat.call([], ["^{"], this.content.toTokens(), ["}"]);
    }
    toPrettierDoc() {
        if (this.content.TYPE === "group") {
            return PRETTIER.concat(["^", this.content.toPrettierDoc()]);
        }
        return PRETTIER.concat(["^{", trimWhitespace(this.content).toPrettierDoc(), "}"]);
    }
};

var InlineMath = class InlineMath extends ContentOnlyNode {
    toString() {
        return "$" + this.content.join("") + "$";
    }
    toTokens() {
        return [].concat.call([], ["$"], this.content.toTokens(), ["$"]);
    }
    toPrettierDoc() {
        return PRETTIER.concat(["$", trimWhitespace(this.content).toPrettierDoc(), "$"]);
    }
};

var DisplayMath = class DisplayMath extends ContentOnlyNode {
    toString() {
        return ESCAPE + "[" + this.content.join("") + ESCAPE + "]";
    }
    toTokens() {
        return [].concat.call(
            [],
            [TOKENS.newline, ESCAPE + "[", TOKENS.indent, TOKENS.newline],
            this.content.toTokens(),
            [TOKENS.endindent, TOKENS.newline, ESCAPE + "]", TOKENS.newline]
        );
    }
    toPrettierDoc() {
        return PRETTIER.concat([
            PRETTIER.hardline,
            ESCAPE + "[",
            PRETTIER.indent(
                PRETTIER.concat([
                    PRETTIER.hardline,
                    PRETTIER.fill([trimWhitespace(this.content).toPrettierDoc()])
                ])
            ),
            PRETTIER.hardline,
            ESCAPE + "]",
            PRETTIER.hardline
        ]);
    }
};

var MathEnv = class MathEnv extends Environment {
    constructor(env, content) {
        super(env, null, content);
    }
};

var Group = class Group extends ContentOnlyNode {
    toString() {
        return "{" + this.content + "}";
    }
    toTokens() {
        return [].concat.call(
            [],
            [TOKENS.nowrap, "{"],
            this.content.toTokens(),
            ["}", TOKENS.endnowrap]
        );
    }
    toPrettierDoc() {
        return PRETTIER.concat(["{", this.content.toPrettierDoc(), "}"]);
    }
};

var Verbatim = class Verbatim extends Environment {
    constructor(content) {
        super("verbatim", null, content);
    }
    toTokens() {
        // Verbatim blocks are a single token
        return [TOKENS.nowrap, "" + this, TOKENS.endnowrap];
    }
    toPrettierDoc() {
        return PRETTIER.concat(["" + this]);
    }
};

var Verb = class Verb extends ASTNode {
    constructor(escapeChar, content) {
        super();
        this["escape"] = escapeChar;
        this.content = content;
    }
    toString() {
        return ESCAPE + "verb" + this["escape"] + this.content + this["escape"];
    }
    toTokens() {
        // Verbatim blocks are a single token
        return [TOKENS.nowrap, "" + this, TOKENS.endnowrap];
    }
    toPrettierDoc() {
        return PRETTIER.concat(["" + this]);
    }
};

var CommentEnv = class CommentEnv extends Environment {
    constructor(content) {
        super("comment", null, content);
    }
    toString() {
        // comment env cannot have anything after it on the same line
        return super.toString() + "\n";
    }
    toTokens() {
        return [TOKENS.nowrap, "" + this, TOKENS.endnowrap];
    }
    toPrettierDoc() {
        return PRETTIER.concat(["" + this]);
    }
};

var CommentNode = class CommentNode extends ASTNode {
    constructor(sameline, content) {
        super("comment");
        this.sameline = sameline;
        this.content = content;
    }
    toString() {
        if (this.sameline) {
            return "%" + this.content + "\n";
        }
        return "\n%" + this.content + "\n";
    }
    toTokens() {
        if (this.sameline) {
            return ["%", "" + this.content, TOKENS.newline];
        }
        return [TOKENS.newline, "%", "" + this.content, TOKENS.newline];
    }
    toPrettierDoc() {
        if (this.sameline) {
            return PRETTIER.concat(["%", "" + this.content, PRETTIER.hardline]);
        }
        return PRETTIER.concat([
            PRETTIER.hardline,
            "%",
            "" + this.content,
            PRETTIER.hardline
        ]);
    }
};

var StringNode = class StringNode extends ASTNode {
    constructor(content) {
        super("string");
        this.content = content;
    }
    toString() {
        return this.content;
    }
    toTokens() {
        return [this.content];
    }
    get length() {
        return this.content.length;
    }
    toPrettierDoc() {
        return this.content;
    }
};

var ArgList = class ArgList extends ContentOnlyNode {
    toString() {
        return this.content ? this.content.join("") : "";
    }
    toTokens() {
        return this.content.toTokens();
    }
    toPrettierDoc() {
        // replace any "," in content with ","+PRETTIER.line
        content = [];
        for (let i of this.content) {
            let rendered = i.toPrettierDoc();
            content.push(rendered);
            if (rendered === ",") {
                content.push(PRETTIER.line);
            }
        }
        //console.log(content)
        //return PRETTIER.indent(PRETTIER.concat(content))
        return PRETTIER.indent(
            PRETTIER.concat(
                [PRETTIER.softline].concat(content)
                //.concat([PRETTIER.softline])
            )
        );
    }
};

var Token = class Token extends ASTNode {
    constructor(token) {
        super();
        this.content = token;
    }
    toString() {
        return "" + this.token;
    }
    toTokens() {
        return [this.token];
    }
    toPrettierDoc() {
        return [this.token];
    }
};


/*
 * Take a PEG object and convert it into a LaTeX AST
 */
function PEGtoAST(node) {
    switch (type(node)) {
        case "null":
            return undefined;
        case "string":
            return new StringNode(node);
        case "array":
            return new ASTNodeList(...node.map(PEGtoAST));
        case "object":
            switch (node.TYPE) {
                case "whitespace":
                    return new Whitespace();
                case "parbreak":
                    return new Parbreak();
                case "subscript":
                    return new Subscript(PEGtoAST(node.content));
                case "superscript":
                    return new Superscript(PEGtoAST(node.content));
                case "inlinemath":
                    return new InlineMath(PEGtoAST(node.content));
                case "displaymath":
                    return new DisplayMath(PEGtoAST(node.content));
                case "mathenv":
                    return new MathEnv(node.env, PEGtoAST(node.content));
                case "group":
                    return new Group(PEGtoAST(node.content));
                case "macro":
                    return new Macro(node.content, PEGtoAST(node.args));
                case "environment":
                    return new Environment(
                        PEGtoAST(node.env),
                        PEGtoAST(node.args),
                        PEGtoAST(node.content)
                    );
                case "verbatim":
                    return new Verbatim(PEGtoAST(node.content));
                case "verb":
                    return new Verb(node["escape"], PEGtoAST(node.content));
                case "commentenv":
                    return new CommentEnv(PEGtoAST([node.content]));
                case "comment":
                    return new CommentNode(
                        node.sameline,
                        PEGtoAST(node.content)
                    );
                case "arglist":
                    return new ArgList(PEGtoAST(node.content));
            }
    }
}

/*
 * Annotate a LaTeX AST by putting in references to the parent, next,
 * and previous nodes.
 */
function ASTannotate(ast, parent, next, previous) {
    if (!ast) {
        return;
    }
    ast.parent = parent;
    ast.next = next;
    ast.previous = previous;

    switch (ast.TYPE) {
        case "nodelist":
            for (let i = 0; i < ast.length; i++) {
                previous = i === 0 ? null : ast[i - 1];
                next = i === ast.length - 1 ? null : ast[i + 1];
                ASTannotate(ast[i], ast, next, previous);
            }
            break;
        case "arglist":
        case "subscript":
        case "superscript":
        case "inlinemath":
        case "displaymath":
        case "mathenv":
        case "group":
            ASTannotate(ast.content, ast);
            break;
        case "macro":
            ASTannotate(ast.args, ast);
            break;
        case "environment":
            ASTannotate(ast.content, ast);
            ASTannotate(ast.args, ast);
            break;
        case "string":
        case "parbreak":
        case "verbatim":
        case "verb":
        case "commentenv":
        case "comment":
            break;
    }
    return ast;
}

function parse(str) {
    var pegAst = latexpeg.parse(str);
    var ast = PEGtoAST(pegAst);
    ASTannotate(ast);
    return ast;
}

module.exports = {
    astNodes: {
        ASTNodeList,
        ASTNode,
        ContentOnlyNode,
        ArgsNode,
        Environment,
        Macro,
        Parbreak,
        Whitespace,
        Subscript,
        Subscript,
        InlineMath,
        DisplayMath,
        MathEnv,
        Group,
        Verbatim,
        Verb,
        CommentEnv,
        CommentNode,
        StringNode,
        ArgList,
    },
    parse,
    parsePeg: latexpeg.parse,
    printTokenStream: formatterTokens.printTokenStream
}

if (typeof window !== 'undefined') {
    window.exports = module.exports
}
