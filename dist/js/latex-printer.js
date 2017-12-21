/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

/*
 * Utilities for printing a token stream
 */

const TOKENS = {
    indent: Symbol("indent"),
    endindent: Symbol("endindent"),
    nowrap: Symbol("nowrap"),
    endnowrap: Symbol("endnowrap"),
    newline: Symbol("newline"),
    ensurenew: Symbol("ensurenew"), // ensure that there is a new line inserted, but don't insert one if there's already one
    ensurepar: Symbol("ensurepar"),
    preferpar: Symbol("preferpar"), // prefer a par, but if there is a newline there already, accept that
    parbreak: Symbol("parbreak"),
    whitespace: Symbol("whitespace")
};

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

// barebones printer for token streams
function printTokenStream(stream, maxwidth=60, tabwidth=8) {
    function wrappable(token) {
        if (type(token) !== 'string') {
            return false
        }
        token = token[0]
        return !token.match(/[.,\/#!$%\^&\*;:{}=\-_`~()]/)
    }
    var ret = "";
    var padding = "";
    var currlen = 0, width = 0;
    var nowrap = 0;
    var prevFunctionalToken = null;
    for (let i=0; i < stream.length; i++) {
        var token = stream[i];

        // handle all special tokens
        switch (token) {
            case TOKENS.indent:
                padding += "\t"
                break
            case TOKENS.endindent:
                padding = padding.slice(0, padding.length - 1)
                break
            case TOKENS.nowrap:
                nowrap += 1
                break
            case TOKENS.endnowrap:
                nowrap = nowrap > 0 ? nowrap - 1 : 0
                break
            case TOKENS.ensurenew:
                // if we just put down a newline or parbreak, ensurenew doesn't need to do anything
                if (prevFunctionalToken == TOKENS.newline || prevFunctionalToken == TOKENS.parbreak) {
                    break;
                }
            case TOKENS.newline:
                ret += "\n" + padding;
                currlen = padding.length*tabwidth;
                break
            case TOKENS.ensurepar:
                if (prevFunctionalToken == TOKENS.parbreak) {
                    break;
                } else if (prevFunctionalToken == TOKENS.newline) {
                    // if we just put down a newline, then only add one more newline
                    ret += "\n" + padding;
                    currlen = padding.length*tabwidth;
                    break;
                }
            case TOKENS.preferpar:
                // if there is no break, make a par break, but if there was just a break, that's
                // good enough.
                if (prevFunctionalToken == TOKENS.newline || prevFunctionalToken == TOKENS.parbreak) {
                    break;
                }
            case TOKENS.parbreak:
                ret += "\n\n" + padding;
                currlen = padding.length*tabwidth;
                break
            case TOKENS.whitespace:
                ret += " "
        }
        if (type(token) === 'string') {
                // if it won't fit on this line but will fit on the next line
                // and it's a wrappable character (e.g., not punctuation)
                if (currlen + token.length > maxwidth 
                    && padding.length*tabwidth + token.length < maxwidth
                    && !nowrap
                    && wrappable(token)) {
                    ret += "\n" + padding;
                    currlen = padding.length*tabwidth;
                }
                ret += token;
                currlen += token.length;

        }
        if (token != TOKENS.indent && token != TOKENS.endindent && token != TOKENS.nowrap && token != TOKENS.endnowrap) {
            prevFunctionalToken = token;
        }
    }
    return ret;
}


module.exports = {
    tokens: TOKENS,
    printTokenStream
}


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


/*
 * utils for pretty-printing latex
 */

const astbuilder = __webpack_require__(2);
const tokenprinter = __webpack_require__(0);

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
    } = astbuilder.astNodes;


function isSpaceOrPar(x) {
    return x.TYPE === "whitespace" || x.TYPE === "parbreak";
}

function ASTremoveExcessSpace(ast) {
    if (!ast) {
        return
    }
    if (ast.TYPE === "nodelist") {
        let ret = [], lastPushed = "";

        for (let i = 0; i < ast.length; i++) {
            let node = ast[i]
            ASTremoveExcessSpace(node)
            let next = ast[i+1] || ""
            let prev = ast[i-1] || ""
            
            // we don't need spaces at the start or end of an environment
            var isEnvironmentBody = node.parent && (node.parent.parent ? node.parent.parent instanceof Environment : false)
            if (isSpaceOrPar(node) && isEnvironmentBody && (prev === "" || next == "")) {
                continue;
            }
            // we don't need a space before or after an Environment
            if (isSpaceOrPar(node) && (next instanceof Environment || prev instanceof Environment)) {
                continue;
            }

            // we're only removing whitespace and linebreaks
            if (!isSpaceOrPar(node) || !isSpaceOrPar(lastPushed)) {
                ret.push(node);
                lastPushed = node;
                continue;
            }

            if (lastPushed.TYPE === "whitespace" && node.TYPE === "parbreak") {
                // a sequences of whitespaces and newlines should turn into a newline
                // a sequence of whitespaces should turn into a whitespace
                // so in this case, override the whitespace with a newline.
                ret[ret.length - 1] = node;
                lastPushed = node;
            }
        }

        // glue it together in place
        ast.length = 0;
        for (let i of ret) {
            ast.push(i);
        }
    } else if (ast.content) {
        ASTremoveExcessSpace(ast.content)
    }
    return ast
}

function print(str) {
    var parsed = str;
    if (typeof str === 'string') {
        parsed = astbuilder.parse(str);
    }
    ASTremoveExcessSpace(parsed);
    return tokenprinter.printTokenStream(parsed.toTokens());
}

module.exports = astbuilder;
module.exports.print = print;

if (typeof window !== 'undefined') {
    window.exports = module.exports
}


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 * walk through the PEG.js generated AST for the LaTeX document,
 * clean it up, and convert it to smarter classes
 */



// PEG.js parser
const latexpeg = __webpack_require__(3);
// Bare minimum to be able to export a prettier.js doc tree for pretty-printing
const PRETTIER = __webpack_require__(4);
const tokenprinter = __webpack_require__(0);
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


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*
 * Generated by PEG.js 0.10.0.
 *
 * http://pegjs.org/
 */



function peg$subclass(child, parent) {
  function ctor() { this.constructor = child; }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
}

function peg$SyntaxError(message, expected, found, location) {
  this.message  = message;
  this.expected = expected;
  this.found    = found;
  this.location = location;
  this.name     = "SyntaxError";

  if (typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(this, peg$SyntaxError);
  }
}

peg$subclass(peg$SyntaxError, Error);

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return "\"" + literalEscape(expectation.text) + "\"";
        },

        "class": function(expectation) {
          var escapedParts = "",
              i;

          for (i = 0; i < expectation.parts.length; i++) {
            escapedParts += expectation.parts[i] instanceof Array
              ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
              : classEscape(expectation.parts[i]);
          }

          return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
        },

        any: function(expectation) {
          return "any character";
        },

        end: function(expectation) {
          return "end of input";
        },

        other: function(expectation) {
          return expectation.description;
        }
      };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g,  '\\"')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/\]/g, '\\]')
      .replace(/\^/g, '\\^')
      .replace(/-/g,  '\\-')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = new Array(expected.length),
        i, j;

    for (i = 0; i < expected.length; i++) {
      descriptions[i] = describeExpectation(expected[i]);
    }

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== void 0 ? options : {};

  var peg$FAILED = {},

      peg$startRuleFunctions = { document: peg$parsedocument },
      peg$startRuleFunction  = peg$parsedocument,

      peg$c0 = peg$otherExpectation("document"),
      peg$c1 = peg$otherExpectation("token"),
      peg$c2 = function(t) {return t},
      peg$c3 = function(eq) {return {TYPE:"inlinemath", content: eq}},
      peg$c4 = function() {return {TYPE:"parbreak"}},
      peg$c5 = peg$anyExpectation(),
      peg$c6 = function(x) {return x},
      peg$c7 = function(x) {return x.join("")},
      peg$c8 = peg$otherExpectation("math token"),
      peg$c9 = function(x) {return {TYPE:"superscript", content:x}},
      peg$c10 = function(x) {return {TYPE:"subscript", content:x}},
      peg$c11 = peg$otherExpectation("args token"),
      peg$c12 = ",",
      peg$c13 = peg$literalExpectation(",", false),
      peg$c14 = "]",
      peg$c15 = peg$literalExpectation("]", false),
      peg$c16 = peg$otherExpectation("nonchar token"),
      peg$c17 = "%",
      peg$c18 = peg$literalExpectation("%", false),
      peg$c19 = peg$otherExpectation("whitespace"),
      peg$c20 = function() {return {TYPE: "whitespace"}},
      peg$c21 = peg$otherExpectation("number"),
      peg$c22 = ".",
      peg$c23 = peg$literalExpectation(".", false),
      peg$c24 = function(a, b) {return a.join("") + "." + b.join("")},
      peg$c25 = function(b) {return "." + b.join("")},
      peg$c26 = function(a) {return a.join("") + "."},
      peg$c27 = peg$otherExpectation("special macro"),
      peg$c28 = "verb",
      peg$c29 = peg$literalExpectation("verb", false),
      peg$c30 = function(e, end) {return end == e},
      peg$c31 = function(e, x) {return x},
      peg$c32 = function(e, x, end) {return end == e},
      peg$c33 = function(e, x) {return {TYPE:"verb", escape:e, content:x.join("")}},
      peg$c34 = "begin{verbatim}",
      peg$c35 = peg$literalExpectation("begin{verbatim}", false),
      peg$c36 = "end{verbatim}",
      peg$c37 = peg$literalExpectation("end{verbatim}", false),
      peg$c38 = function(x) {return {TYPE:"verbatim", content:x.join("")}},
      peg$c39 = "begin{comment}",
      peg$c40 = peg$literalExpectation("begin{comment}", false),
      peg$c41 = "end{comment}",
      peg$c42 = peg$literalExpectation("end{comment}", false),
      peg$c43 = function(x) {return {TYPE:"commentenv", content:x.join("")}},
      peg$c44 = function(x) {return {TYPE:"displaymath", content:x}},
      peg$c45 = function(x) {return {TYPE:"inlinemath", content:x}},
      peg$c46 = peg$otherExpectation("macro"),
      peg$c47 = function(n) {return n.join("")},
      peg$c48 = function(n) {return n},
      peg$c49 = function(m) {return {TYPE:"macro", content:m}},
      peg$c50 = peg$otherExpectation("group"),
      peg$c51 = function(c) {return c},
      peg$c52 = function(x) {return {TYPE:"group", content:x}},
      peg$c53 = peg$otherExpectation("argument list"),
      peg$c54 = "[",
      peg$c55 = peg$literalExpectation("[", false),
      peg$c56 = function(body) {return {TYPE:"arglist", content:body}},
      peg$c57 = peg$otherExpectation("environment"),
      peg$c58 = function(env, args, end_env) {return compare_env(env,end_env)},
      peg$c59 = function(env, args, x) {return x},
      peg$c60 = function(env, args, body) {return {TYPE:"environment", env:env.content, args:args, content:body}},
      peg$c61 = peg$otherExpectation("math environment"),
      peg$c62 = function(env, end_env) {console.log(env, end_env,  compare_env({content:[env]},end_env));return compare_env({content:[env]},end_env)},
      peg$c63 = function(env, x) {return x},
      peg$c64 = function(env, body) {return {TYPE:"mathenv", env:env, content:body}},
      peg$c65 = peg$otherExpectation("math group"),
      peg$c66 = peg$otherExpectation("full comment"),
      peg$c67 = function(x) {return {TYPE:"comment", content:x, sameline:false}},
      peg$c68 = function(x) {return {TYPE:"comment", content:x, sameline:true}},
      peg$c69 = "(",
      peg$c70 = peg$literalExpectation("(", false),
      peg$c71 = ")",
      peg$c72 = peg$literalExpectation(")", false),
      peg$c73 = "begin",
      peg$c74 = peg$literalExpectation("begin", false),
      peg$c75 = "end",
      peg$c76 = peg$literalExpectation("end", false),
      peg$c77 = "equation*",
      peg$c78 = peg$literalExpectation("equation*", false),
      peg$c79 = "equation",
      peg$c80 = peg$literalExpectation("equation", false),
      peg$c81 = "align*",
      peg$c82 = peg$literalExpectation("align*", false),
      peg$c83 = "align",
      peg$c84 = peg$literalExpectation("align", false),
      peg$c85 = "alignat*",
      peg$c86 = peg$literalExpectation("alignat*", false),
      peg$c87 = "alignat",
      peg$c88 = peg$literalExpectation("alignat", false),
      peg$c89 = "gather*",
      peg$c90 = peg$literalExpectation("gather*", false),
      peg$c91 = "gather",
      peg$c92 = peg$literalExpectation("gather", false),
      peg$c93 = "multline*",
      peg$c94 = peg$literalExpectation("multline*", false),
      peg$c95 = "multline",
      peg$c96 = peg$literalExpectation("multline", false),
      peg$c97 = "flalign*",
      peg$c98 = peg$literalExpectation("flalign*", false),
      peg$c99 = "flalign",
      peg$c100 = peg$literalExpectation("flalign", false),
      peg$c101 = "split",
      peg$c102 = peg$literalExpectation("split", false),
      peg$c103 = "math",
      peg$c104 = peg$literalExpectation("math", false),
      peg$c105 = "displaymath",
      peg$c106 = peg$literalExpectation("displaymath", false),
      peg$c107 = peg$otherExpectation("escape"),
      peg$c108 = "\\",
      peg$c109 = peg$literalExpectation("\\", false),
      peg$c110 = "{",
      peg$c111 = peg$literalExpectation("{", false),
      peg$c112 = "}",
      peg$c113 = peg$literalExpectation("}", false),
      peg$c114 = "$",
      peg$c115 = peg$literalExpectation("$", false),
      peg$c116 = "&",
      peg$c117 = peg$literalExpectation("&", false),
      peg$c118 = peg$otherExpectation("newline"),
      peg$c119 = "\r",
      peg$c120 = peg$literalExpectation("\r", false),
      peg$c121 = "\n",
      peg$c122 = peg$literalExpectation("\n", false),
      peg$c123 = "\r\n",
      peg$c124 = peg$literalExpectation("\r\n", false),
      peg$c125 = "#",
      peg$c126 = peg$literalExpectation("#", false),
      peg$c127 = "^",
      peg$c128 = peg$literalExpectation("^", false),
      peg$c129 = "_",
      peg$c130 = peg$literalExpectation("_", false),
      peg$c131 = "\0",
      peg$c132 = peg$literalExpectation("\0", false),
      peg$c133 = /^[ \t]/,
      peg$c134 = peg$classExpectation([" ", "\t"], false, false),
      peg$c135 = function() { return " "},
      peg$c136 = peg$otherExpectation("letter"),
      peg$c137 = /^[a-zA-Z]/,
      peg$c138 = peg$classExpectation([["a", "z"], ["A", "Z"]], false, false),
      peg$c139 = peg$otherExpectation("digit"),
      peg$c140 = /^[0-9]/,
      peg$c141 = peg$classExpectation([["0", "9"]], false, false),
      peg$c142 = peg$otherExpectation("punctuation"),
      peg$c143 = /^[.,;:\-*\/()!?=+<>[\]]/,
      peg$c144 = peg$classExpectation([".", ",", ";", ":", "-", "*", "/", "(", ")", "!", "?", "=", "+", "<", ">", "[", "]"], false, false),
      peg$c145 = function(c) {return c.join("")},

      peg$currPos          = 0,
      peg$savedPos         = 0,
      peg$posDetailsCache  = [{ line: 1, column: 1 }],
      peg$maxFailPos       = 0,
      peg$maxFailExpected  = [],
      peg$silentFails      = 0,

      peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }

  function expected(description, location) {
    location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

    throw peg$buildStructuredError(
      [peg$otherExpectation(description)],
      input.substring(peg$savedPos, peg$currPos),
      location
    );
  }

  function error(message, location) {
    location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

    throw peg$buildSimpleError(message, location);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$anyExpectation() {
    return { type: "any" };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos], p;

    if (details) {
      return details;
    } else {
      p = pos - 1;
      while (!peg$posDetailsCache[p]) {
        p--;
      }

      details = peg$posDetailsCache[p];
      details = {
        line:   details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;
      return details;
    }
  }

  function peg$computeLocation(startPos, endPos) {
    var startPosDetails = peg$computePosDetails(startPos),
        endPosDetails   = peg$computePosDetails(endPos);

    return {
      start: {
        offset: startPos,
        line:   startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line:   endPosDetails.line,
        column: endPosDetails.column
      }
    };
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parsedocument() {
    var s0, s1;

    peg$silentFails++;
    s0 = [];
    s1 = peg$parsetoken();
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$parsetoken();
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c0); }
    }

    return s0;
  }

  function peg$parsetoken() {
    var s0, s1, s2, s3, s4, s5;

    peg$silentFails++;
    s0 = peg$parsespecial_macro();
    if (s0 === peg$FAILED) {
      s0 = peg$parsemacro();
      if (s0 === peg$FAILED) {
        s0 = peg$parsefull_comment();
        if (s0 === peg$FAILED) {
          s0 = peg$parsegroup();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsemath_shift();
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$currPos;
              s4 = peg$currPos;
              peg$silentFails++;
              s5 = peg$parsemath_shift();
              peg$silentFails--;
              if (s5 === peg$FAILED) {
                s4 = void 0;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parsemath_token();
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s4 = peg$c2(s5);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
              if (s3 !== peg$FAILED) {
                while (s3 !== peg$FAILED) {
                  s2.push(s3);
                  s3 = peg$currPos;
                  s4 = peg$currPos;
                  peg$silentFails++;
                  s5 = peg$parsemath_shift();
                  peg$silentFails--;
                  if (s5 === peg$FAILED) {
                    s4 = void 0;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parsemath_token();
                    if (s5 !== peg$FAILED) {
                      peg$savedPos = s3;
                      s4 = peg$c2(s5);
                      s3 = s4;
                    } else {
                      peg$currPos = s3;
                      s3 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                }
              } else {
                s2 = peg$FAILED;
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parsemath_shift();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c3(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$parsealignment_tab();
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = [];
                s2 = peg$parsesp();
                while (s2 !== peg$FAILED) {
                  s1.push(s2);
                  s2 = peg$parsesp();
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$parsenl();
                  if (s2 !== peg$FAILED) {
                    s3 = [];
                    s4 = peg$parsenl();
                    if (s4 !== peg$FAILED) {
                      while (s4 !== peg$FAILED) {
                        s3.push(s4);
                        s4 = peg$parsenl();
                      }
                    } else {
                      s3 = peg$FAILED;
                    }
                    if (s3 !== peg$FAILED) {
                      s4 = [];
                      s5 = peg$parsesp();
                      while (s5 !== peg$FAILED) {
                        s4.push(s5);
                        s5 = peg$parsesp();
                      }
                      if (s4 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c4();
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$parsemacro_parameter();
                  if (s0 === peg$FAILED) {
                    s0 = peg$parsesuperscript();
                    if (s0 === peg$FAILED) {
                      s0 = peg$parsesubscript();
                      if (s0 === peg$FAILED) {
                        s0 = peg$parseignore();
                        if (s0 === peg$FAILED) {
                          s0 = peg$parsenumber();
                          if (s0 === peg$FAILED) {
                            s0 = peg$parsewhitespace();
                            if (s0 === peg$FAILED) {
                              s0 = peg$currPos;
                              s1 = [];
                              s2 = peg$currPos;
                              s3 = peg$currPos;
                              peg$silentFails++;
                              s4 = peg$parsenonchar_token();
                              peg$silentFails--;
                              if (s4 === peg$FAILED) {
                                s3 = void 0;
                              } else {
                                peg$currPos = s3;
                                s3 = peg$FAILED;
                              }
                              if (s3 !== peg$FAILED) {
                                if (input.length > peg$currPos) {
                                  s4 = input.charAt(peg$currPos);
                                  peg$currPos++;
                                } else {
                                  s4 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c5); }
                                }
                                if (s4 !== peg$FAILED) {
                                  peg$savedPos = s2;
                                  s3 = peg$c6(s4);
                                  s2 = s3;
                                } else {
                                  peg$currPos = s2;
                                  s2 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s2;
                                s2 = peg$FAILED;
                              }
                              if (s2 !== peg$FAILED) {
                                while (s2 !== peg$FAILED) {
                                  s1.push(s2);
                                  s2 = peg$currPos;
                                  s3 = peg$currPos;
                                  peg$silentFails++;
                                  s4 = peg$parsenonchar_token();
                                  peg$silentFails--;
                                  if (s4 === peg$FAILED) {
                                    s3 = void 0;
                                  } else {
                                    peg$currPos = s3;
                                    s3 = peg$FAILED;
                                  }
                                  if (s3 !== peg$FAILED) {
                                    if (input.length > peg$currPos) {
                                      s4 = input.charAt(peg$currPos);
                                      peg$currPos++;
                                    } else {
                                      s4 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c5); }
                                    }
                                    if (s4 !== peg$FAILED) {
                                      peg$savedPos = s2;
                                      s3 = peg$c6(s4);
                                      s2 = s3;
                                    } else {
                                      peg$currPos = s2;
                                      s2 = peg$FAILED;
                                    }
                                  } else {
                                    peg$currPos = s2;
                                    s2 = peg$FAILED;
                                  }
                                }
                              } else {
                                s1 = peg$FAILED;
                              }
                              if (s1 !== peg$FAILED) {
                                peg$savedPos = s0;
                                s1 = peg$c7(s1);
                              }
                              s0 = s1;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c1); }
    }

    return s0;
  }

  function peg$parsemath_token() {
    var s0, s1, s2, s3, s4;

    peg$silentFails++;
    s0 = peg$parsespecial_macro();
    if (s0 === peg$FAILED) {
      s0 = peg$parsemacro();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsefull_comment();
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c6(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parsewhitespace();
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsewhitespace();
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parsegroup();
            if (s2 !== peg$FAILED) {
              s3 = [];
              s4 = peg$parsewhitespace();
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                s4 = peg$parsewhitespace();
              }
              if (s3 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c6(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = [];
            s2 = peg$parsewhitespace();
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$parsewhitespace();
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parsealignment_tab();
              if (s2 !== peg$FAILED) {
                s3 = [];
                s4 = peg$parsewhitespace();
                while (s4 !== peg$FAILED) {
                  s3.push(s4);
                  s4 = peg$parsewhitespace();
                }
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c6(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = [];
              s2 = peg$parsewhitespace();
              while (s2 !== peg$FAILED) {
                s1.push(s2);
                s2 = peg$parsewhitespace();
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$parsemacro_parameter();
                if (s2 !== peg$FAILED) {
                  s3 = [];
                  s4 = peg$parsewhitespace();
                  while (s4 !== peg$FAILED) {
                    s3.push(s4);
                    s4 = peg$parsewhitespace();
                  }
                  if (s3 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c6(s2);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = [];
                s2 = peg$parsewhitespace();
                while (s2 !== peg$FAILED) {
                  s1.push(s2);
                  s2 = peg$parsewhitespace();
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$parsesuperscript();
                  if (s2 !== peg$FAILED) {
                    s3 = [];
                    s4 = peg$parsewhitespace();
                    while (s4 !== peg$FAILED) {
                      s3.push(s4);
                      s4 = peg$parsewhitespace();
                    }
                    if (s3 !== peg$FAILED) {
                      s4 = peg$parsemath_token();
                      if (s4 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c9(s4);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  s1 = [];
                  s2 = peg$parsewhitespace();
                  while (s2 !== peg$FAILED) {
                    s1.push(s2);
                    s2 = peg$parsewhitespace();
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = peg$parsesubscript();
                    if (s2 !== peg$FAILED) {
                      s3 = [];
                      s4 = peg$parsewhitespace();
                      while (s4 !== peg$FAILED) {
                        s3.push(s4);
                        s4 = peg$parsewhitespace();
                      }
                      if (s3 !== peg$FAILED) {
                        s4 = peg$parsemath_token();
                        if (s4 !== peg$FAILED) {
                          peg$savedPos = s0;
                          s1 = peg$c10(s4);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$parseignore();
                    if (s0 === peg$FAILED) {
                      s0 = peg$parsewhitespace();
                      if (s0 === peg$FAILED) {
                        if (input.length > peg$currPos) {
                          s0 = input.charAt(peg$currPos);
                          peg$currPos++;
                        } else {
                          s0 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c5); }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c8); }
    }

    return s0;
  }

  function peg$parseargs_token() {
    var s0, s1, s2, s3, s4, s5;

    peg$silentFails++;
    s0 = peg$parsespecial_macro();
    if (s0 === peg$FAILED) {
      s0 = peg$parsemacro();
      if (s0 === peg$FAILED) {
        s0 = peg$parsefull_comment();
        if (s0 === peg$FAILED) {
          s0 = peg$parsegroup();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsemath_shift();
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$currPos;
              s4 = peg$currPos;
              peg$silentFails++;
              s5 = peg$parsemath_shift();
              peg$silentFails--;
              if (s5 === peg$FAILED) {
                s4 = void 0;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parsemath_token();
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s4 = peg$c2(s5);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
              if (s3 !== peg$FAILED) {
                while (s3 !== peg$FAILED) {
                  s2.push(s3);
                  s3 = peg$currPos;
                  s4 = peg$currPos;
                  peg$silentFails++;
                  s5 = peg$parsemath_shift();
                  peg$silentFails--;
                  if (s5 === peg$FAILED) {
                    s4 = void 0;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parsemath_token();
                    if (s5 !== peg$FAILED) {
                      peg$savedPos = s3;
                      s4 = peg$c2(s5);
                      s3 = s4;
                    } else {
                      peg$currPos = s3;
                      s3 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                }
              } else {
                s2 = peg$FAILED;
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parsemath_shift();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c3(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$parsealignment_tab();
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = [];
                s2 = peg$parsesp();
                while (s2 !== peg$FAILED) {
                  s1.push(s2);
                  s2 = peg$parsesp();
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$parsenl();
                  if (s2 !== peg$FAILED) {
                    s3 = [];
                    s4 = peg$parsenl();
                    if (s4 !== peg$FAILED) {
                      while (s4 !== peg$FAILED) {
                        s3.push(s4);
                        s4 = peg$parsenl();
                      }
                    } else {
                      s3 = peg$FAILED;
                    }
                    if (s3 !== peg$FAILED) {
                      s4 = [];
                      s5 = peg$parsesp();
                      while (s5 !== peg$FAILED) {
                        s4.push(s5);
                        s5 = peg$parsesp();
                      }
                      if (s4 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c4();
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$parsemacro_parameter();
                  if (s0 === peg$FAILED) {
                    s0 = peg$parsesuperscript();
                    if (s0 === peg$FAILED) {
                      s0 = peg$parsesubscript();
                      if (s0 === peg$FAILED) {
                        s0 = peg$parseignore();
                        if (s0 === peg$FAILED) {
                          s0 = peg$parsenumber();
                          if (s0 === peg$FAILED) {
                            s0 = peg$parsewhitespace();
                            if (s0 === peg$FAILED) {
                              s0 = peg$currPos;
                              s1 = [];
                              s2 = peg$currPos;
                              s3 = peg$currPos;
                              peg$silentFails++;
                              s4 = peg$parsenonchar_token();
                              if (s4 === peg$FAILED) {
                                if (input.charCodeAt(peg$currPos) === 44) {
                                  s4 = peg$c12;
                                  peg$currPos++;
                                } else {
                                  s4 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c13); }
                                }
                                if (s4 === peg$FAILED) {
                                  if (input.charCodeAt(peg$currPos) === 93) {
                                    s4 = peg$c14;
                                    peg$currPos++;
                                  } else {
                                    s4 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c15); }
                                  }
                                }
                              }
                              peg$silentFails--;
                              if (s4 === peg$FAILED) {
                                s3 = void 0;
                              } else {
                                peg$currPos = s3;
                                s3 = peg$FAILED;
                              }
                              if (s3 !== peg$FAILED) {
                                if (input.length > peg$currPos) {
                                  s4 = input.charAt(peg$currPos);
                                  peg$currPos++;
                                } else {
                                  s4 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c5); }
                                }
                                if (s4 !== peg$FAILED) {
                                  peg$savedPos = s2;
                                  s3 = peg$c6(s4);
                                  s2 = s3;
                                } else {
                                  peg$currPos = s2;
                                  s2 = peg$FAILED;
                                }
                              } else {
                                peg$currPos = s2;
                                s2 = peg$FAILED;
                              }
                              if (s2 !== peg$FAILED) {
                                while (s2 !== peg$FAILED) {
                                  s1.push(s2);
                                  s2 = peg$currPos;
                                  s3 = peg$currPos;
                                  peg$silentFails++;
                                  s4 = peg$parsenonchar_token();
                                  if (s4 === peg$FAILED) {
                                    if (input.charCodeAt(peg$currPos) === 44) {
                                      s4 = peg$c12;
                                      peg$currPos++;
                                    } else {
                                      s4 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c13); }
                                    }
                                    if (s4 === peg$FAILED) {
                                      if (input.charCodeAt(peg$currPos) === 93) {
                                        s4 = peg$c14;
                                        peg$currPos++;
                                      } else {
                                        s4 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c15); }
                                      }
                                    }
                                  }
                                  peg$silentFails--;
                                  if (s4 === peg$FAILED) {
                                    s3 = void 0;
                                  } else {
                                    peg$currPos = s3;
                                    s3 = peg$FAILED;
                                  }
                                  if (s3 !== peg$FAILED) {
                                    if (input.length > peg$currPos) {
                                      s4 = input.charAt(peg$currPos);
                                      peg$currPos++;
                                    } else {
                                      s4 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c5); }
                                    }
                                    if (s4 !== peg$FAILED) {
                                      peg$savedPos = s2;
                                      s3 = peg$c6(s4);
                                      s2 = s3;
                                    } else {
                                      peg$currPos = s2;
                                      s2 = peg$FAILED;
                                    }
                                  } else {
                                    peg$currPos = s2;
                                    s2 = peg$FAILED;
                                  }
                                }
                              } else {
                                s1 = peg$FAILED;
                              }
                              if (s1 !== peg$FAILED) {
                                peg$savedPos = s0;
                                s1 = peg$c7(s1);
                              }
                              s0 = s1;
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c11); }
    }

    return s0;
  }

  function peg$parsenonchar_token() {
    var s0, s1;

    peg$silentFails++;
    s0 = peg$parseescape();
    if (s0 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 37) {
        s0 = peg$c17;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c18); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parsebegin_group();
        if (s0 === peg$FAILED) {
          s0 = peg$parseend_group();
          if (s0 === peg$FAILED) {
            s0 = peg$parsemath_shift();
            if (s0 === peg$FAILED) {
              s0 = peg$parsealignment_tab();
              if (s0 === peg$FAILED) {
                s0 = peg$parsenl();
                if (s0 === peg$FAILED) {
                  s0 = peg$parsemacro_parameter();
                  if (s0 === peg$FAILED) {
                    s0 = peg$parsesuperscript();
                    if (s0 === peg$FAILED) {
                      s0 = peg$parsesubscript();
                      if (s0 === peg$FAILED) {
                        s0 = peg$parseignore();
                        if (s0 === peg$FAILED) {
                          s0 = peg$parsesp();
                          if (s0 === peg$FAILED) {
                            s0 = peg$parseEOF();
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c16); }
    }

    return s0;
  }

  function peg$parsewhitespace() {
    var s0, s1, s2, s3, s4, s5, s6;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parsenl();
    if (s2 !== peg$FAILED) {
      s3 = [];
      s4 = peg$parsesp();
      while (s4 !== peg$FAILED) {
        s3.push(s4);
        s4 = peg$parsesp();
      }
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      s2 = [];
      s3 = peg$parsesp();
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsesp();
        }
      } else {
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parsenl();
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$parsesp();
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parsesp();
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = peg$parsenl();
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = void 0;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              s2 = [s2, s3, s4, s5];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$FAILED;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$FAILED;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 === peg$FAILED) {
        s1 = [];
        s2 = peg$parsesp();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsesp();
          }
        } else {
          s1 = peg$FAILED;
        }
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c20();
    }
    s0 = s1;
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c19); }
    }

    return s0;
  }

  function peg$parsenumber() {
    var s0, s1, s2, s3, s4;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsenum();
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsenum();
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 46) {
        s2 = peg$c22;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c23); }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$parsenum();
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parsenum();
          }
        } else {
          s3 = peg$FAILED;
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c24(s1, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s1 = peg$c22;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c23); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parsenum();
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parsenum();
          }
        } else {
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c25(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parsenum();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parsenum();
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s2 = peg$c22;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c23); }
          }
          if (s2 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c26(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c21); }
    }

    return s0;
  }

  function peg$parsespecial_macro() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parseescape();
    if (s1 !== peg$FAILED) {
      if (input.substr(peg$currPos, 4) === peg$c28) {
        s2 = peg$c28;
        peg$currPos += 4;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }
      if (s2 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c5); }
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$currPos;
          s6 = peg$currPos;
          peg$silentFails++;
          s7 = peg$currPos;
          if (input.length > peg$currPos) {
            s8 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s8 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c5); }
          }
          if (s8 !== peg$FAILED) {
            peg$savedPos = peg$currPos;
            s9 = peg$c30(s3, s8);
            if (s9) {
              s9 = void 0;
            } else {
              s9 = peg$FAILED;
            }
            if (s9 !== peg$FAILED) {
              s8 = [s8, s9];
              s7 = s8;
            } else {
              peg$currPos = s7;
              s7 = peg$FAILED;
            }
          } else {
            peg$currPos = s7;
            s7 = peg$FAILED;
          }
          peg$silentFails--;
          if (s7 === peg$FAILED) {
            s6 = void 0;
          } else {
            peg$currPos = s6;
            s6 = peg$FAILED;
          }
          if (s6 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s7 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s7 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c5); }
            }
            if (s7 !== peg$FAILED) {
              peg$savedPos = s5;
              s6 = peg$c31(s3, s7);
              s5 = s6;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$currPos;
            s6 = peg$currPos;
            peg$silentFails++;
            s7 = peg$currPos;
            if (input.length > peg$currPos) {
              s8 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s8 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c5); }
            }
            if (s8 !== peg$FAILED) {
              peg$savedPos = peg$currPos;
              s9 = peg$c30(s3, s8);
              if (s9) {
                s9 = void 0;
              } else {
                s9 = peg$FAILED;
              }
              if (s9 !== peg$FAILED) {
                s8 = [s8, s9];
                s7 = s8;
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
            } else {
              peg$currPos = s7;
              s7 = peg$FAILED;
            }
            peg$silentFails--;
            if (s7 === peg$FAILED) {
              s6 = void 0;
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            if (s6 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s7 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c5); }
              }
              if (s7 !== peg$FAILED) {
                peg$savedPos = s5;
                s6 = peg$c31(s3, s7);
                s5 = s6;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$currPos;
            if (input.length > peg$currPos) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c5); }
            }
            if (s6 !== peg$FAILED) {
              peg$savedPos = peg$currPos;
              s7 = peg$c32(s3, s4, s6);
              if (s7) {
                s7 = void 0;
              } else {
                s7 = peg$FAILED;
              }
              if (s7 !== peg$FAILED) {
                s6 = [s6, s7];
                s5 = s6;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c33(s3, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseescape();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 15) === peg$c34) {
          s2 = peg$c34;
          peg$currPos += 15;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$currPos;
          peg$silentFails++;
          s6 = peg$currPos;
          s7 = peg$parseescape();
          if (s7 !== peg$FAILED) {
            if (input.substr(peg$currPos, 13) === peg$c36) {
              s8 = peg$c36;
              peg$currPos += 13;
            } else {
              s8 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c37); }
            }
            if (s8 !== peg$FAILED) {
              s7 = [s7, s8];
              s6 = s7;
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
          } else {
            peg$currPos = s6;
            s6 = peg$FAILED;
          }
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = void 0;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c5); }
            }
            if (s6 !== peg$FAILED) {
              peg$savedPos = s4;
              s5 = peg$c6(s6);
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = peg$currPos;
            s7 = peg$parseescape();
            if (s7 !== peg$FAILED) {
              if (input.substr(peg$currPos, 13) === peg$c36) {
                s8 = peg$c36;
                peg$currPos += 13;
              } else {
                s8 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c37); }
              }
              if (s8 !== peg$FAILED) {
                s7 = [s7, s8];
                s6 = s7;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = void 0;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c5); }
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s4;
                s5 = peg$c6(s6);
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseescape();
            if (s4 !== peg$FAILED) {
              if (input.substr(peg$currPos, 13) === peg$c36) {
                s5 = peg$c36;
                peg$currPos += 13;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c37); }
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c38(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseescape();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 14) === peg$c39) {
            s2 = peg$c39;
            peg$currPos += 14;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c40); }
          }
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$currPos;
            s5 = peg$currPos;
            peg$silentFails++;
            s6 = peg$currPos;
            s7 = peg$parseescape();
            if (s7 !== peg$FAILED) {
              if (input.substr(peg$currPos, 12) === peg$c41) {
                s8 = peg$c41;
                peg$currPos += 12;
              } else {
                s8 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c42); }
              }
              if (s8 !== peg$FAILED) {
                s7 = [s7, s8];
                s6 = s7;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            peg$silentFails--;
            if (s6 === peg$FAILED) {
              s5 = void 0;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
            if (s5 !== peg$FAILED) {
              if (input.length > peg$currPos) {
                s6 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c5); }
              }
              if (s6 !== peg$FAILED) {
                peg$savedPos = s4;
                s5 = peg$c6(s6);
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$currPos;
              s5 = peg$currPos;
              peg$silentFails++;
              s6 = peg$currPos;
              s7 = peg$parseescape();
              if (s7 !== peg$FAILED) {
                if (input.substr(peg$currPos, 12) === peg$c41) {
                  s8 = peg$c41;
                  peg$currPos += 12;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c42); }
                }
                if (s8 !== peg$FAILED) {
                  s7 = [s7, s8];
                  s6 = s7;
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
              peg$silentFails--;
              if (s6 === peg$FAILED) {
                s5 = void 0;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
              if (s5 !== peg$FAILED) {
                if (input.length > peg$currPos) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c5); }
                }
                if (s6 !== peg$FAILED) {
                  peg$savedPos = s4;
                  s5 = peg$c6(s6);
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$parseescape();
              if (s4 !== peg$FAILED) {
                if (input.substr(peg$currPos, 12) === peg$c41) {
                  s5 = peg$c41;
                  peg$currPos += 12;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c42); }
                }
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c43(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parsebegin_display_math();
          if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$currPos;
            s4 = peg$currPos;
            peg$silentFails++;
            s5 = peg$parseend_display_math();
            peg$silentFails--;
            if (s5 === peg$FAILED) {
              s4 = void 0;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parsemath_token();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s3;
                s4 = peg$c6(s5);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
            if (s3 !== peg$FAILED) {
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                s3 = peg$currPos;
                s4 = peg$currPos;
                peg$silentFails++;
                s5 = peg$parseend_display_math();
                peg$silentFails--;
                if (s5 === peg$FAILED) {
                  s4 = void 0;
                } else {
                  peg$currPos = s4;
                  s4 = peg$FAILED;
                }
                if (s4 !== peg$FAILED) {
                  s5 = peg$parsemath_token();
                  if (s5 !== peg$FAILED) {
                    peg$savedPos = s3;
                    s4 = peg$c6(s5);
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              }
            } else {
              s2 = peg$FAILED;
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parseend_display_math();
              if (s3 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c44(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parsebegin_inline_math();
            if (s1 !== peg$FAILED) {
              s2 = [];
              s3 = peg$currPos;
              s4 = peg$currPos;
              peg$silentFails++;
              s5 = peg$parseend_inline_math();
              peg$silentFails--;
              if (s5 === peg$FAILED) {
                s4 = void 0;
              } else {
                peg$currPos = s4;
                s4 = peg$FAILED;
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parsemath_token();
                if (s5 !== peg$FAILED) {
                  peg$savedPos = s3;
                  s4 = peg$c6(s5);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$FAILED;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
              if (s3 !== peg$FAILED) {
                while (s3 !== peg$FAILED) {
                  s2.push(s3);
                  s3 = peg$currPos;
                  s4 = peg$currPos;
                  peg$silentFails++;
                  s5 = peg$parseend_inline_math();
                  peg$silentFails--;
                  if (s5 === peg$FAILED) {
                    s4 = void 0;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parsemath_token();
                    if (s5 !== peg$FAILED) {
                      peg$savedPos = s3;
                      s4 = peg$c6(s5);
                      s3 = s4;
                    } else {
                      peg$currPos = s3;
                      s3 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                }
              } else {
                s2 = peg$FAILED;
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parseend_inline_math();
                if (s3 !== peg$FAILED) {
                  peg$savedPos = s0;
                  s1 = peg$c45(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parsemath_shift();
              if (s1 !== peg$FAILED) {
                s2 = peg$parsemath_shift();
                if (s2 !== peg$FAILED) {
                  s3 = [];
                  s4 = peg$currPos;
                  s5 = peg$currPos;
                  peg$silentFails++;
                  s6 = peg$currPos;
                  s7 = peg$parsemath_shift();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parsemath_shift();
                    if (s8 !== peg$FAILED) {
                      s7 = [s7, s8];
                      s6 = s7;
                    } else {
                      peg$currPos = s6;
                      s6 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s6;
                    s6 = peg$FAILED;
                  }
                  peg$silentFails--;
                  if (s6 === peg$FAILED) {
                    s5 = void 0;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parsemath_token();
                    if (s6 !== peg$FAILED) {
                      peg$savedPos = s4;
                      s5 = peg$c6(s6);
                      s4 = s5;
                    } else {
                      peg$currPos = s4;
                      s4 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s4;
                    s4 = peg$FAILED;
                  }
                  if (s4 !== peg$FAILED) {
                    while (s4 !== peg$FAILED) {
                      s3.push(s4);
                      s4 = peg$currPos;
                      s5 = peg$currPos;
                      peg$silentFails++;
                      s6 = peg$currPos;
                      s7 = peg$parsemath_shift();
                      if (s7 !== peg$FAILED) {
                        s8 = peg$parsemath_shift();
                        if (s8 !== peg$FAILED) {
                          s7 = [s7, s8];
                          s6 = s7;
                        } else {
                          peg$currPos = s6;
                          s6 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s6;
                        s6 = peg$FAILED;
                      }
                      peg$silentFails--;
                      if (s6 === peg$FAILED) {
                        s5 = void 0;
                      } else {
                        peg$currPos = s5;
                        s5 = peg$FAILED;
                      }
                      if (s5 !== peg$FAILED) {
                        s6 = peg$parsemath_token();
                        if (s6 !== peg$FAILED) {
                          peg$savedPos = s4;
                          s5 = peg$c6(s6);
                          s4 = s5;
                        } else {
                          peg$currPos = s4;
                          s4 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s4;
                        s4 = peg$FAILED;
                      }
                    }
                  } else {
                    s3 = peg$FAILED;
                  }
                  if (s3 !== peg$FAILED) {
                    s4 = peg$parsemath_shift();
                    if (s4 !== peg$FAILED) {
                      s5 = peg$parsemath_shift();
                      if (s5 !== peg$FAILED) {
                        peg$savedPos = s0;
                        s1 = peg$c44(s3);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$parsemath_environment();
                if (s0 === peg$FAILED) {
                  s0 = peg$parseenvironment();
                }
              }
            }
          }
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c27); }
    }

    return s0;
  }

  function peg$parsemacro() {
    var s0, s1, s2, s3, s4;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    s2 = peg$parseescape();
    if (s2 !== peg$FAILED) {
      s3 = [];
      s4 = peg$parsechar();
      if (s4 !== peg$FAILED) {
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parsechar();
        }
      } else {
        s3 = peg$FAILED;
      }
      if (s3 !== peg$FAILED) {
        peg$savedPos = s1;
        s2 = peg$c47(s3);
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 === peg$FAILED) {
      s1 = peg$currPos;
      s2 = peg$parseescape();
      if (s2 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c5); }
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s1;
          s2 = peg$c48(s3);
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c49(s1);
    }
    s0 = s1;
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c46); }
    }

    return s0;
  }

  function peg$parsegroup() {
    var s0, s1, s2, s3, s4, s5;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsebegin_group();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$currPos;
      peg$silentFails++;
      s5 = peg$parseend_group();
      peg$silentFails--;
      if (s5 === peg$FAILED) {
        s4 = void 0;
      } else {
        peg$currPos = s4;
        s4 = peg$FAILED;
      }
      if (s4 !== peg$FAILED) {
        s5 = peg$parsetoken();
        if (s5 !== peg$FAILED) {
          peg$savedPos = s3;
          s4 = peg$c51(s5);
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        s5 = peg$parseend_group();
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = void 0;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parsetoken();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c51(s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseend_group();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c52(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c50); }
    }

    return s0;
  }

  function peg$parseargument_list() {
    var s0, s1, s2, s3, s4, s5, s6;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    s2 = peg$parsewhitespace();
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$parsewhitespace();
    }
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 91) {
        s2 = peg$c54;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c55); }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$currPos;
        s5 = peg$currPos;
        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 93) {
          s6 = peg$c14;
          peg$currPos++;
        } else {
          s6 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c15); }
        }
        peg$silentFails--;
        if (s6 === peg$FAILED) {
          s5 = void 0;
        } else {
          peg$currPos = s5;
          s5 = peg$FAILED;
        }
        if (s5 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s6 = peg$c12;
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c13); }
          }
          if (s6 === peg$FAILED) {
            s6 = peg$parseargs_token();
          }
          if (s6 !== peg$FAILED) {
            peg$savedPos = s4;
            s5 = peg$c6(s6);
            s4 = s5;
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$currPos;
          s5 = peg$currPos;
          peg$silentFails++;
          if (input.charCodeAt(peg$currPos) === 93) {
            s6 = peg$c14;
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c15); }
          }
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = void 0;
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s6 = peg$c12;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c13); }
            }
            if (s6 === peg$FAILED) {
              s6 = peg$parseargs_token();
            }
            if (s6 !== peg$FAILED) {
              peg$savedPos = s4;
              s5 = peg$c6(s6);
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$FAILED;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$FAILED;
          }
        }
        if (s3 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 93) {
            s4 = peg$c14;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c15); }
          }
          if (s4 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c56(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c53); }
    }

    return s0;
  }

  function peg$parseenvironment() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsebegin_env();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsegroup();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseargument_list();
        if (s3 === peg$FAILED) {
          s3 = null;
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$currPos;
          s6 = peg$currPos;
          peg$silentFails++;
          s7 = peg$currPos;
          s8 = peg$parseend_env();
          if (s8 !== peg$FAILED) {
            s9 = peg$parsegroup();
            if (s9 !== peg$FAILED) {
              peg$savedPos = peg$currPos;
              s10 = peg$c58(s2, s3, s9);
              if (s10) {
                s10 = void 0;
              } else {
                s10 = peg$FAILED;
              }
              if (s10 !== peg$FAILED) {
                s8 = [s8, s9, s10];
                s7 = s8;
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
            } else {
              peg$currPos = s7;
              s7 = peg$FAILED;
            }
          } else {
            peg$currPos = s7;
            s7 = peg$FAILED;
          }
          peg$silentFails--;
          if (s7 === peg$FAILED) {
            s6 = void 0;
          } else {
            peg$currPos = s6;
            s6 = peg$FAILED;
          }
          if (s6 !== peg$FAILED) {
            s7 = peg$parsetoken();
            if (s7 !== peg$FAILED) {
              peg$savedPos = s5;
              s6 = peg$c59(s2, s3, s7);
              s5 = s6;
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          } else {
            peg$currPos = s5;
            s5 = peg$FAILED;
          }
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$currPos;
            s6 = peg$currPos;
            peg$silentFails++;
            s7 = peg$currPos;
            s8 = peg$parseend_env();
            if (s8 !== peg$FAILED) {
              s9 = peg$parsegroup();
              if (s9 !== peg$FAILED) {
                peg$savedPos = peg$currPos;
                s10 = peg$c58(s2, s3, s9);
                if (s10) {
                  s10 = void 0;
                } else {
                  s10 = peg$FAILED;
                }
                if (s10 !== peg$FAILED) {
                  s8 = [s8, s9, s10];
                  s7 = s8;
                } else {
                  peg$currPos = s7;
                  s7 = peg$FAILED;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
            } else {
              peg$currPos = s7;
              s7 = peg$FAILED;
            }
            peg$silentFails--;
            if (s7 === peg$FAILED) {
              s6 = void 0;
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parsetoken();
              if (s7 !== peg$FAILED) {
                peg$savedPos = s5;
                s6 = peg$c59(s2, s3, s7);
                s5 = s6;
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$FAILED;
            }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parseend_env();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsegroup();
              if (s6 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c60(s2, s3, s4);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c57); }
    }

    return s0;
  }

  function peg$parsemath_environment() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsebegin_env();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsebegin_group();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsemath_env_name();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseend_group();
          if (s4 !== peg$FAILED) {
            s5 = [];
            s6 = peg$currPos;
            s7 = peg$currPos;
            peg$silentFails++;
            s8 = peg$currPos;
            s9 = peg$parseend_env();
            if (s9 !== peg$FAILED) {
              s10 = peg$parsegroup();
              if (s10 !== peg$FAILED) {
                peg$savedPos = peg$currPos;
                s11 = peg$c62(s3, s10);
                if (s11) {
                  s11 = void 0;
                } else {
                  s11 = peg$FAILED;
                }
                if (s11 !== peg$FAILED) {
                  s9 = [s9, s10, s11];
                  s8 = s9;
                } else {
                  peg$currPos = s8;
                  s8 = peg$FAILED;
                }
              } else {
                peg$currPos = s8;
                s8 = peg$FAILED;
              }
            } else {
              peg$currPos = s8;
              s8 = peg$FAILED;
            }
            peg$silentFails--;
            if (s8 === peg$FAILED) {
              s7 = void 0;
            } else {
              peg$currPos = s7;
              s7 = peg$FAILED;
            }
            if (s7 !== peg$FAILED) {
              s8 = peg$parsemath_token();
              if (s8 !== peg$FAILED) {
                peg$savedPos = s6;
                s7 = peg$c63(s3, s8);
                s6 = s7;
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            } else {
              peg$currPos = s6;
              s6 = peg$FAILED;
            }
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = peg$currPos;
              s7 = peg$currPos;
              peg$silentFails++;
              s8 = peg$currPos;
              s9 = peg$parseend_env();
              if (s9 !== peg$FAILED) {
                s10 = peg$parsegroup();
                if (s10 !== peg$FAILED) {
                  peg$savedPos = peg$currPos;
                  s11 = peg$c62(s3, s10);
                  if (s11) {
                    s11 = void 0;
                  } else {
                    s11 = peg$FAILED;
                  }
                  if (s11 !== peg$FAILED) {
                    s9 = [s9, s10, s11];
                    s8 = s9;
                  } else {
                    peg$currPos = s8;
                    s8 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s8;
                  s8 = peg$FAILED;
                }
              } else {
                peg$currPos = s8;
                s8 = peg$FAILED;
              }
              peg$silentFails--;
              if (s8 === peg$FAILED) {
                s7 = void 0;
              } else {
                peg$currPos = s7;
                s7 = peg$FAILED;
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parsemath_token();
                if (s8 !== peg$FAILED) {
                  peg$savedPos = s6;
                  s7 = peg$c63(s3, s8);
                  s6 = s7;
                } else {
                  peg$currPos = s6;
                  s6 = peg$FAILED;
                }
              } else {
                peg$currPos = s6;
                s6 = peg$FAILED;
              }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parseend_env();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsebegin_group();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parsemath_env_name();
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parseend_group();
                    if (s9 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c64(s3, s5);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c61); }
    }

    return s0;
  }

  function peg$parsemath_group() {
    var s0, s1, s2, s3, s4, s5;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsebegin_group();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$currPos;
      peg$silentFails++;
      s5 = peg$parseend_group();
      peg$silentFails--;
      if (s5 === peg$FAILED) {
        s4 = void 0;
      } else {
        peg$currPos = s4;
        s4 = peg$FAILED;
      }
      if (s4 !== peg$FAILED) {
        s5 = peg$parsemath_token();
        if (s5 !== peg$FAILED) {
          peg$savedPos = s3;
          s4 = peg$c51(s5);
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        s5 = peg$parseend_group();
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = void 0;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parsemath_token();
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c51(s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseend_group();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c52(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c65); }
    }

    return s0;
  }

  function peg$parsefull_comment() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$parsenl();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsecomment();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c67(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsecomment();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c68(s1);
      }
      s0 = s1;
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c66); }
    }

    return s0;
  }

  function peg$parsebegin_display_math() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseescape();
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 91) {
        s2 = peg$c54;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c55); }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseend_display_math() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseescape();
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 93) {
        s2 = peg$c14;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c15); }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsebegin_inline_math() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseescape();
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 40) {
        s2 = peg$c69;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c70); }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseend_inline_math() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseescape();
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 41) {
        s2 = peg$c71;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c72); }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsebegin_env() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseescape();
    if (s1 !== peg$FAILED) {
      if (input.substr(peg$currPos, 5) === peg$c73) {
        s2 = peg$c73;
        peg$currPos += 5;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c74); }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseend_env() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseescape();
    if (s1 !== peg$FAILED) {
      if (input.substr(peg$currPos, 3) === peg$c75) {
        s2 = peg$c75;
        peg$currPos += 3;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c76); }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsemath_env_name() {
    var s0;

    if (input.substr(peg$currPos, 9) === peg$c77) {
      s0 = peg$c77;
      peg$currPos += 9;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c78); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 8) === peg$c79) {
        s0 = peg$c79;
        peg$currPos += 8;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c80); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c81) {
          s0 = peg$c81;
          peg$currPos += 6;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c82); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c83) {
            s0 = peg$c83;
            peg$currPos += 5;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c84); }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 8) === peg$c85) {
              s0 = peg$c85;
              peg$currPos += 8;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c86); }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 7) === peg$c87) {
                s0 = peg$c87;
                peg$currPos += 7;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c88); }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 7) === peg$c89) {
                  s0 = peg$c89;
                  peg$currPos += 7;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c90); }
                }
                if (s0 === peg$FAILED) {
                  if (input.substr(peg$currPos, 6) === peg$c91) {
                    s0 = peg$c91;
                    peg$currPos += 6;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c92); }
                  }
                  if (s0 === peg$FAILED) {
                    if (input.substr(peg$currPos, 9) === peg$c93) {
                      s0 = peg$c93;
                      peg$currPos += 9;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c94); }
                    }
                    if (s0 === peg$FAILED) {
                      if (input.substr(peg$currPos, 8) === peg$c95) {
                        s0 = peg$c95;
                        peg$currPos += 8;
                      } else {
                        s0 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c96); }
                      }
                      if (s0 === peg$FAILED) {
                        if (input.substr(peg$currPos, 8) === peg$c97) {
                          s0 = peg$c97;
                          peg$currPos += 8;
                        } else {
                          s0 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c98); }
                        }
                        if (s0 === peg$FAILED) {
                          if (input.substr(peg$currPos, 7) === peg$c99) {
                            s0 = peg$c99;
                            peg$currPos += 7;
                          } else {
                            s0 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c100); }
                          }
                          if (s0 === peg$FAILED) {
                            if (input.substr(peg$currPos, 5) === peg$c101) {
                              s0 = peg$c101;
                              peg$currPos += 5;
                            } else {
                              s0 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c102); }
                            }
                            if (s0 === peg$FAILED) {
                              if (input.substr(peg$currPos, 4) === peg$c103) {
                                s0 = peg$c103;
                                peg$currPos += 4;
                              } else {
                                s0 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c104); }
                              }
                              if (s0 === peg$FAILED) {
                                if (input.substr(peg$currPos, 11) === peg$c105) {
                                  s0 = peg$c105;
                                  peg$currPos += 11;
                                } else {
                                  s0 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c106); }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parseescape() {
    var s0, s1;

    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 92) {
      s0 = peg$c108;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c109); }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c107); }
    }

    return s0;
  }

  function peg$parsebegin_group() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 123) {
      s0 = peg$c110;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c111); }
    }

    return s0;
  }

  function peg$parseend_group() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 125) {
      s0 = peg$c112;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c113); }
    }

    return s0;
  }

  function peg$parsemath_shift() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 36) {
      s0 = peg$c114;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c115); }
    }

    return s0;
  }

  function peg$parsealignment_tab() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 38) {
      s0 = peg$c116;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c117); }
    }

    return s0;
  }

  function peg$parsenl() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = peg$currPos;
    peg$silentFails++;
    if (input.charCodeAt(peg$currPos) === 13) {
      s2 = peg$c119;
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c120); }
    }
    peg$silentFails--;
    if (s2 === peg$FAILED) {
      s1 = void 0;
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 10) {
        s2 = peg$c121;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c122); }
      }
      if (s2 !== peg$FAILED) {
        s1 = [s1, s2];
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      if (input.charCodeAt(peg$currPos) === 13) {
        s0 = peg$c119;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c120); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c123) {
          s0 = peg$c123;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c124); }
        }
      }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c118); }
    }

    return s0;
  }

  function peg$parsemacro_parameter() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 35) {
      s0 = peg$c125;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c126); }
    }

    return s0;
  }

  function peg$parsesuperscript() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 94) {
      s0 = peg$c127;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c128); }
    }

    return s0;
  }

  function peg$parsesubscript() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 95) {
      s0 = peg$c129;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c130); }
    }

    return s0;
  }

  function peg$parseignore() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 0) {
      s0 = peg$c131;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c132); }
    }

    return s0;
  }

  function peg$parsesp() {
    var s0, s1, s2;

    peg$silentFails++;
    s0 = peg$currPos;
    s1 = [];
    if (peg$c133.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c134); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c133.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c134); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c135();
    }
    s0 = s1;
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c19); }
    }

    return s0;
  }

  function peg$parsechar() {
    var s0, s1;

    peg$silentFails++;
    if (peg$c137.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c138); }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c136); }
    }

    return s0;
  }

  function peg$parsenum() {
    var s0, s1;

    peg$silentFails++;
    if (peg$c140.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c141); }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c139); }
    }

    return s0;
  }

  function peg$parsepunctuation() {
    var s0, s1;

    peg$silentFails++;
    if (peg$c143.test(input.charAt(peg$currPos))) {
      s0 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c144); }
    }
    peg$silentFails--;
    if (s0 === peg$FAILED) {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c142); }
    }

    return s0;
  }

  function peg$parsecomment() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 37) {
      s1 = peg$c17;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c18); }
    }
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$currPos;
      s4 = peg$currPos;
      peg$silentFails++;
      s5 = peg$parsenl();
      peg$silentFails--;
      if (s5 === peg$FAILED) {
        s4 = void 0;
      } else {
        peg$currPos = s4;
        s4 = peg$FAILED;
      }
      if (s4 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s5 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s5 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c5); }
        }
        if (s5 !== peg$FAILED) {
          peg$savedPos = s3;
          s4 = peg$c51(s5);
          s3 = s4;
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      } else {
        peg$currPos = s3;
        s3 = peg$FAILED;
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        s5 = peg$parsenl();
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = void 0;
        } else {
          peg$currPos = s4;
          s4 = peg$FAILED;
        }
        if (s4 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c5); }
          }
          if (s5 !== peg$FAILED) {
            peg$savedPos = s3;
            s4 = peg$c51(s5);
            s3 = s4;
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$FAILED;
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parsenl();
        if (s3 === peg$FAILED) {
          s3 = peg$parseEOF();
        }
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c145(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseEOF() {
    var s0, s1;

    s0 = peg$currPos;
    peg$silentFails++;
    if (input.length > peg$currPos) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c5); }
    }
    peg$silentFails--;
    if (s1 === peg$FAILED) {
      s0 = void 0;
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }


      function compare_env(g1,g2) {
          return g1.content.join("") == g2.content.join("");
      }


  peg$result = peg$startRuleFunction();

  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

module.exports = {
  SyntaxError: peg$SyntaxError,
  parse:       peg$parse
};


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process) {/******************* from prettier.js *******************/
const PRETTIER = (function(){
    function assertDoc(val) {
      /* istanbul ignore if */
      if (
        !(typeof val === "string" || (val != null && typeof val.type === "string"))
      ) {
        throw new Error(
          "Value " + JSON.stringify(val) + " is not a valid document"
        );
      }
    }

    function concat(parts) {
      if (process.env.NODE_ENV !== "production") {
        parts.forEach(assertDoc);
      }

      // We cannot do this until we change `printJSXElement` to not
      // access the internals of a document directly.
      // if(parts.length === 1) {
      //   // If it's a single document, no need to concat it.
      //   return parts[0];
      // }
      return { type: "concat", parts };
    }

    function indent(contents) {
      if (process.env.NODE_ENV !== "production") {
        assertDoc(contents);
      }

      return { type: "indent", contents };
    }

    function align(n, contents) {
      if (process.env.NODE_ENV !== "production") {
        assertDoc(contents);
      }

      return { type: "align", contents, n };
    }

    function group(contents, opts) {
      opts = opts || {};

      if (process.env.NODE_ENV !== "production") {
        assertDoc(contents);
      }

      return {
        type: "group",
        contents: contents,
        break: !!opts.shouldBreak,
        expandedStates: opts.expandedStates
      };
    }

    function conditionalGroup(states, opts) {
      return group(
        states[0],
        Object.assign(opts || {}, { expandedStates: states })
      );
    }

    function fill(parts) {
      if (process.env.NODE_ENV !== "production") {
        parts.forEach(assertDoc);
      }

      return { type: "fill", parts };
    }

    function ifBreak(breakContents, flatContents) {
      if (process.env.NODE_ENV !== "production") {
        if (breakContents) {
          assertDoc(breakContents);
        }
        if (flatContents) {
          assertDoc(flatContents);
        }
      }

      return { type: "if-break", breakContents, flatContents };
    }

    function lineSuffix(contents) {
      if (process.env.NODE_ENV !== "production") {
        assertDoc(contents);
      }
      return { type: "line-suffix", contents };
    }

    const lineSuffixBoundary = { type: "line-suffix-boundary" };
    const breakParent = { type: "break-parent" };
    const line = { type: "line" };
    const softline = { type: "line", soft: true };
    const hardline = concat([{ type: "line", hard: true }, breakParent]);
    const literalline = concat([
      { type: "line", hard: true, literal: true },
      breakParent
    ]);
    const cursor = { type: "cursor", placeholder: Symbol("cursor") };

    function join(sep, arr) {
      const res = [];

      for (let i = 0; i < arr.length; i++) {
        if (i !== 0) {
          res.push(sep);
        }

        res.push(arr[i]);
      }

      return concat(res);
    }

    function addAlignmentToDoc(doc, size, tabWidth) {
      let aligned = doc;
      if (size > 0) {
        // Use indent to add tabs for all the levels of tabs we need
        for (let i = 0; i < Math.floor(size / tabWidth); ++i) {
          aligned = indent(aligned);
        }
        // Use align for all the spaces that are needed
        aligned = align(size % tabWidth, aligned);
        // size is absolute from 0 and not relative to the current
        // indentation, so we use -Infinity to reset the indentation to 0
        aligned = align(-Infinity, aligned);
      }
      return aligned;
    }

    const PRETTIER = {
      concat,
      join,
      line,
      softline,
      hardline,
      literalline,
      group,
      conditionalGroup,
      fill,
      lineSuffix,
      lineSuffixBoundary,
      cursor,
      breakParent,
      ifBreak,
      indent,
      align,
      addAlignmentToDoc
    };
    return PRETTIER;
})();

module.exports = PRETTIER;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(5)))

/***/ }),
/* 5 */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ })
/******/ ]);