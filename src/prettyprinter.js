"use strict";

/*
 * utils for pretty-printing latex
 */

const astbuilder = require("./astbuilder.js");
const tokenprinter = require("./tokenprinter.js");
const prettierPrintDocToString = require("./prettier/doc-printer.js").printDocToString;
const prettierNormalizeOptions = require("./prettier/options.js").normalize;

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
module.exports.prettierPrintDoc = (doc, opts) => {
    opts = prettierNormalizeOptions(opts);
    return prettierPrintDocToString(doc, opts).formatted;
};


if (typeof window !== 'undefined') {
    window.exports = module.exports
}
