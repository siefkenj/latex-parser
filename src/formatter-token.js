"use strict";
/*
 * add token-based formatting to the AST
 */

const {type, ESCAPE, callSuper} = require("./utils.js")
const latexAst = require("./latex-ast.js")

const {
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

/*
 * Special tokens used in the token stream
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
        

/*
 * Add toTokens method to each class
 */

ASTNodeList.prototype.toTokens = function() {
    return [].concat.apply([], this.map(x => x.toTokens()));
};

ArgsNode.prototype.toTokens = function() {
    if (this.args) {
        return ["["].concat(this.args.toTokens()).concat("]");
    }
    return [];
};

Environment.prototype.toTokens = function() {
    return [].concat.call(
        [],
        [TOKENS.ensurenew, this.envStart, TOKENS.indent],
        callSuper(this, "toTokens", [], Environment), // ArgsNode knows how to make arguments into tokens
        [TOKENS.newline],
        this.content.toTokens(),
        [TOKENS.endindent, TOKENS.newline, this.envEnd]
    );
};

Macro.prototype.toTokens = function() {
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
        // tokenize ourself with args, and then put in our `params`
        var toks = start.concat(callSuper(this, "toTokens", [], Macro));
        return toks.concat(this.params.toTokens());
};

Parbreak.prototype.toTokens = function() {
    return [TOKENS.parbreak];
};

Whitespace.prototype.toTokens = function() {
    return [TOKENS.whitespace];
};

Subscript.prototype.toTokens = function() {
    if (this.content.TYPE === "group") {
        return [].concat.call([], ["_"], this.content.toTokens());
    }
    return [].concat.call([], ["_{"], this.content.toTokens(), ["}"]);
};

Superscript.prototype.toTokens = function() {
    if (this.content.TYPE === "group") {
        return [].concat.call([], ["^"], this.content.toTokens());
    }
    return [].concat.call([], ["^{"], this.content.toTokens(), ["}"]);
};

InlineMath.prototype.toTokens = function() {
    return [].concat.call([], ["$"], this.content.toTokens(), ["$"]);
};

DisplayMath.prototype.toTokens = function() {
    return [].concat.call(
        [],
        [TOKENS.newline, ESCAPE + "[", TOKENS.indent, TOKENS.newline],
        this.content.toTokens(),
        [TOKENS.endindent, TOKENS.newline, ESCAPE + "]", TOKENS.newline]
    );
};

Group.prototype.toTokens = function() {
    return [].concat.call(
        [],
        [TOKENS.nowrap, "{"],
        this.content.toTokens(),
        ["}", TOKENS.endnowrap]
    );
};

Verbatim.prototype.toTokens = function() {
    // Verbatim blocks are a single token
    return [TOKENS.nowrap, "" + this, TOKENS.endnowrap];
};

Verb.prototype.toTokens = Verbatim.prototype.toTokens;

CommentEnv.prototype.toTokens = Verbatim.prototype.toTokens;

CommentNode.prototype.toTokens = function() {
    if (this.sameline) {
        return ["%" + this.content, TOKENS.newline];
    }
    return [TOKENS.newline, "%" + this.content, TOKENS.newline];
};

StringNode.prototype.toTokens = function() {
    return [this.content]
};

ArgList.prototype.toTokens = function() {
    return this.content.toTokens()
};


/*
 * Print a token stream
 */
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

