/*
 * walk through the PEG.js generated AST for the LaTeX document,
 * clean it up, and convert it to smarter classes
 */

"use strict";

// PEG.js parser
const latexpeg = require("./latexpeg.js");
// Bare minimum to be able to export a prettier.js doc tree for pretty-printing
const PRETTIER = require("./prettierutil.js");
const tokenprinter = require("./tokenprinter.js");
const TOKENS = tokenprinter.tokens;

var LINEWRAP = 80,
    ESCAPE = "\\";

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
    constructor(args) {
        super();
        this.args = args;
    }
    get argsString() {
        if (this.args) {
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
            case "item":
                return PRETTIER.concat([PRETTIER.hardline, start]);
                start = [TOKENS.preferpar].concat(start);
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
        return PRETTIER.concat(["_{", this.content.toPrettierDoc(), "}"]);
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
        return PRETTIER.concat(["^{", this.content.toPrettierDoc(), "}"]);
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
        return PRETTIER.concat(["$", this.content.toPrettierDoc(), "$"]);
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
                    PRETTIER.fill([this.content.toPrettierDoc()])
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
    printTokenStream: tokenprinter.printTokenStream
}

if (typeof window !== 'undefined') {
    window.exports = module.exports
}
