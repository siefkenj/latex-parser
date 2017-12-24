"use strict";

/*
 * utility functions for poking around the AST
 */

const {type, ESCAPE} = require("./utils.js")
const latexAst = require("./latex-ast.js");
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

function strToAST(tok) {
    // inputs a string or macro (string starting with \
    // and returns an AST node.
    if (type(tok) === "string") {
        if (tok.charAt(0) === "\\") {
            tok = new Macro(tok.slice(1))
        } else {
            tok = new StringNode(tok)
        }
    }
    return tok;
}

function isMathEnvironment(x) {
    if (typeof x === "undefined") {
        return false
    }
    if (x.TYPE === "inlinemath" || x.TYPE === "displaymath" || x.TYPE === "mathenv") {
        return true
    }
    return false
}

function isSpaceOrPar(x) {
    if (x == null) {
        return false;
    }
    return x.TYPE === "whitespace" || x.TYPE === "parbreak";
}

function trimWhitespace(nodeList) {
    // trim whitespace or newlines from the front
    // and end of an ASTNodeList or an array
    // this operation is destructive
    while (nodeList.length > 0 && isSpaceOrPar(nodeList[0])) {
        nodeList.shift()
    }
    while (nodeList.length > 0 && isSpaceOrPar(nodeList[nodeList.length - 1])) {
        nodeList.pop()
    }
    return nodeList;
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

function cmpStringNode(node, cmp, substr=null){
    // Compares `node` with `cmp` if it is a string
    // or a macro; if `substr='start'` returns true
    // if the string starts with that, if `substr='end'`
    // returns true if it ends with it.
    // If you're comparing with a macro, `cmp` must start with \
    if (typeof node === "undefined") {
        return false;
    }
    switch (node.TYPE) {
        case "macro":
            if (cmp.startsWith("\\")) {
                cmp = cmp.slice(1);
            } else {
                return false
            }
        case "string":
            switch (substr) {
                case "start":
                case "starts":
                    return node.content.startsWith(cmp)
                case "end":
                case "ends":
                    return node.content.endsWith(cmp)
                default:
                    return (node.content === cmp ? true : false)
            }
    }
    return false
}

function gobbleArgsAtMacro(stream, pos=0) {
    // look for macro arguments [..] occuring after position `pos`.
    // gobble them and put them in the args of the macro. 
    // This operation is destructive

    var origPos = pos;
    var openPos = null, closePos = null;
    pos++;
    // eat the whitespace
    while ((stream[pos] || "").TYPE === "whitespace") {
        pos++;
    }
    if (!cmpStringNode(stream[pos], "[", "start")) {
        // we gobbled all the whitespace but didn't find an opening brace
        return stream;
    }
    openPos = pos;
    while (typeof stream[pos] !== 'undefined' 
        && !cmpStringNode(stream[pos], "]", "end")) {
        pos++;
    }
    if (!cmpStringNode(stream[pos], "]", "end")) {
        // we gobbled everything after an opening brace, but didn't find a closing one
        return stream;
    }
    closePos = pos;


    var removed = stream.splice(openPos, closePos - openPos + 1);

    // remove the opening brace
    if (removed[0].content === "[") {
        removed.shift();
    } else {
        removed[0].content = removed[0].content.slice(1);
    }
    // remove the closing brace
    if (removed[removed.length - 1].content === "]") {
        removed.pop();
    } else {
        var cont = removed[removed.length - 1].content;
        removed[removed.length - 1].content = cont.slice(0, cont.length - 1)
    }
    stream[origPos].args = removed

    // if we gobbled any spaces, remove them
    if (openPos > origPos + 1) {
        var excess = openPos - origPos - 1;
        stream.splice(origPos + 1, excess);
    }

    return stream;
}

function ASTattachArgs(ast, context={}) {
    // find macros that have optional args attached
    // to them and attach them.

    if (!ast) {
        return
    }

    if (ast.TYPE === "nodelist") {
        for (let i = ast.length - 1; i >= 0; i--) {
            ASTattachArgs(ast[i], context)

            // attach optional arguments to \\ macro
            if (cmpStringNode(ast[i], "\\\\")) {
                gobbleArgsAtMacro(ast, i)
            }
            
            // attach optional arguments to \\ macro
            if (cmpStringNode(ast[i], "\\item")) {
                gobbleArgsAtMacro(ast, i)
            }

            // replace \cr in math environments
            if (context.math && cmpStringNode(ast[i], "\\cr")) {
                console.log('ma', ast[i])
                ast[i] = new Macro("\\")
            }
        }
    } else if (ast.content) {
        if (ast.TYPE === "environment" || ast.TYPE === "inlinemath" || ast.TYPE === "displaymath" || ast.TYPE === "mathenv") {
            context = {immediate: ast, math: isMathEnvironment(ast) || context.math};
        }
        ASTattachArgs(ast.content, context)
    }
    return ast
}

module.exports = {
    ASTattachArgs,
    gobbleArgsAtMacro,
    cmpStringNode,
    ASTremoveExcessSpace,
    trimWhitespace,
    isSpaceOrPar,
    isMathEnvironment,
    strToAST
}
