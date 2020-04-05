"use strict";

/*
 * class definitions for the javascript latex AST
 * (as opposed to the PEG.js generated one)
 */

const { ESCAPE, type } = require("./utils.js");
const WILD = Symbol("WILD")

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
    equal(other) {
        return false;
    }
};

// A node list that will be recognized as containing a block of text
// for a paragraph when printing.
var ASTParBlock = class ASTParBlock extends ASTNodeList {
    constructor() {
        super(...arguments);
        this.TYPE = "parblock";
    }
};

var ASTNode = class ASTNode {
    constructor(type = this.constructor.name.toLowerCase()) {
        this.TYPE = type;
    }

    equal(other) {
        return other instanceof this.constructor
    }
};

var ContentOnlyNode = class ContentOnlyNode extends ASTNode {
    constructor(content) {
        super();
        this.content = content;
    }
    equal(other) {
        if (super.equal(other)) {
            if (this.content === WILD || other.content === WILD) {
                return true;
            }
            return this.content == other.content;
        }
        return false;
    }
};

var ArgsNode = class ArgsNode extends ASTNode {
    // a node that has this.args as a property
    constructor(args, braces = {open: "[", close: "]"}) {
        super();
        this.args = args;
        this.braces = braces;
    }
    get openBrace() {
        let brace = (this.braces || {})['open']
        if (typeof brace === "undefined") {
            return ""
        }
        return brace
    }
    get closeBrace() {
        let brace = (this.braces || {})['close']
        if (typeof brace === "undefined") {
            return ""
        }
        return brace
    }
    get argsString() {
        if (typeof this.args !== "undefined") {
            return "" + this.openBrace + this.args + this.closeBrace;
        }
        return "";
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
};

var Macro = class Macro extends ArgsNode {
    // Macros can have args (things in []) and params (anything that follows the macro and should
    // be interpreted as parameters that it might manipulate, e.g. the R in "\mathbb R")
    constructor(name, args, params = new ASTNodeList) {
        super(args);
        this.content = name;
        this.params = params;
    }
    toString() {
        return ESCAPE + this.content + this.argsString + this.params;
    }
    equal(other) {
        // shorthand for comparing with macros
        if (type(other) === "string" && other.charAt(0) === "\\") {
            return this.equal(new Macro(other.slice(1)))
        }
        return super.equal(other)
    }
};

var Parbreak = class Parbreak extends ASTNode {
    toString() {
        return "\n\n";
    }
};

var Whitespace = class Whitespace extends ASTNode {
    toString() {
        return " ";
    }
};

var Subscript = class Subscript extends ContentOnlyNode {
    toString() {
        if (this.content.TYPE === "group") {
            return "_" + this.content
        }
        return "_{" + this.content + "}";
    }
};

var Superscript = class Superscript extends ContentOnlyNode {
    toString() {
        if (this.content.TYPE === "group") {
            return "^" + this.content
        }
        return "^{" + this.content + "}";
    }
};

var InlineMath = class InlineMath extends ContentOnlyNode {
    toString() {
        return "$" + this.content.join("") + "$";
    }
};

var DisplayMath = class DisplayMath extends ContentOnlyNode {
    toString() {
        return ESCAPE + "[" + this.content.join("") + ESCAPE + "]";
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
};

var Verbatim = class Verbatim extends Environment {
    constructor(content) {
        super("verbatim", null, content);
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
};

var CommentEnv = class CommentEnv extends Environment {
    constructor(content) {
        super("comment", null, content);
    }
    toString() {
        // comment env cannot have anything after it on the same line
        return super.toString() + "\n";
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
};

var StringNode = class StringNode extends ASTNode {
    constructor(content) {
        super("string");
        this.content = content;
    }
    toString() {
        return this.content;
    }
    get length() {
        return this.content.length;
    }
};

var ArgList = class ArgList extends ContentOnlyNode {
    toString() {
        return this.content ? this.content.join("") : "";
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
        case "parblock":
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
            ASTannotate(ast.params, ast);
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

module.exports = {
    nodeTypes: {
        ASTNodeList,
        ASTParBlock,
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
        ArgList
    },
    WILD,
    PEGtoAST,
    ASTannotate
};
