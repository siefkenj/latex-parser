"use strict";

/*
 * utils for pretty-printing latex
 */

const latexAst = require("./latex-ast.js");
const formatterPrettier = require("./formatter-prettier.js");
const formatterToken = require("./formatter-token.js");
const latexpeg = require("./latexpeg.js");

const {
    ASTattachArgs,
    gobbleArgsAtMacro,
    cmpStringNode,
    ASTremoveExcessSpace,
    trimWhitespace,
    isSpaceOrPar,
    isMathEnvironment,
    strToAST
} = require("./ast-utils.js")



function parse(str) {
    var pegAst = latexpeg.parse(str);
    var ast = latexAst.PEGtoAST(pegAst);
    latexAst.ASTannotate(ast);
    return ast;
}

function tokenPrint(str) {
    var parsed = str;
    if (typeof str === 'string') {
        parsed = parse(str);
    }
    ASTremoveExcessSpace(parsed);
    return formatterToken.printTokenStream(parsed.toTokens());
}


function prettierPrint(str, opts) {
    opts = formatterPrettier.prettierNormalizeOptions(opts);
    var parsed = str;
    if (typeof str === 'string') {
        parsed = parse(str);
    }
    ASTremoveExcessSpace(parsed);
    ASTattachArgs(parsed)
    return formatterPrettier.prettierPrintDocToString(parsed.toPrettierDoc(), opts).formatted;
}

module.exports = formatterPrettier
module.exports.parse = parse
module.exports.prettierPrint = prettierPrint
module.exports.print = tokenPrint
module.exports.tokenPrint = tokenPrint


if (typeof window !== 'undefined') {
    window.exports = module.exports
}
