"use strict";

/*
 * utility functions for poking around the AST
 */

const { type, ESCAPE } = require("./utils.js");
const latexAst = require("./latex-ast.js");
const {
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
} = latexAst.nodeTypes;
const WILD = latexAst.WILD;

window.nodeTypes = latexAst.nodeTypes

const SPECIAL_MACROS = {
    oneParam: new Set([
                "\\mathbb",
                "\\mathrm",
                "\\textrm",
                "\\textsf",
                "\\texttt",
                "\\textit",
                "\\textsl",
                "\\textsc",
                "\\textbf",
                "\\textmd",
                "\\textlf",
                "\\emph",
                "\\textup",
                "\\textnormal",
                "\\uppercase",
                "\\footnote",
                "\\pgfkeys",
                "\\tikzset",
                "\\pgfplotsset",
                "\\usetikzlibrary"
    ]),
    twoParam: new Set([
        "\\frac",
    ]),
    tikzCommand: new Set([
        "\\coordinate",
        "\\draw",
        "\\fill",
        "\\path",
        "\\node",
        "\\graph",
        "\\shade",
        "\\clip",
        "\\calendar",
        "\\scoped",
        "\\matrix",
        "\\addplot",
        "\\spy",
        "\\pattern",
        "\\filldraw",
        "\\shadedraw",
        "\\useasboundingbox",
    ]),
    lineBreakers: [
        new Macro("documentclass"),
        new Macro("usepackage"),
        new Macro("geometry"),
        new Macro("pagestyle"),
        new Macro("section"),
        new Macro("usetikzlibrary"),
        new Macro("tikzset"),
        new Macro("usepgfplotslibrary"),
        new Macro("pgfplotsset"),
        new Macro("newcommand"),
        new Macro("renewcommand"),
        new Macro("includegraphics"),
        new Parbreak(),
        new Macro(""),
        new Macro(""),
        new Environment(WILD),
    ]

}

function strToAST(tok) {
    // inputs a string or macro (string starting with \
    // and returns an AST node.
    if (type(tok) === "string") {
        if (tok.charAt(0) === "\\") {
            tok = new Macro(tok.slice(1));
        } else {
            tok = new StringNode(tok);
        }
    }
    return tok;
}

function isMathEnvironment(x) {
    if (typeof x === "undefined") {
        return false;
    }
    if (
        x.TYPE === "inlinemath" ||
        x.TYPE === "displaymath" ||
        x.TYPE === "mathenv"
    ) {
        return true;
    }
    return false;
}

function isTikzEnvironment(x, inTikz=false) {
    // determine if we're in a tikz environment. inTikz determines
    // whether we are entering a sub-environment from a tikz one
    if (typeof x === "undefined") {
        return false;
    }
    if (
        x.TYPE === "environment"    ) {
        var env = ""+x.env;
        if ( env === "tikzpicture" ){
            return true;
        } else if (inTikz && (new Set(["scope", "axis"])).has(env)) {
            return true;
        }
    }
    return false;
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
        nodeList.shift();
    }
    while (nodeList.length > 0 && isSpaceOrPar(nodeList[nodeList.length - 1])) {
        nodeList.pop();
    }
    return nodeList;
}

function ASTremoveExcessSpace(ast) {
    if (!ast) {
        return;
    }
    if (ast.TYPE === "nodelist") {
        let ret = [],
            lastPushed = "";

        for (let i = 0; i < ast.length; i++) {
            let node = ast[i];
            ASTremoveExcessSpace(node);
            let next = ast[i + 1] || "";
            let prev = ast[i - 1] || "";

            // we don't need spaces at the start or end of an environment
            var isEnvironmentBody =
                node.parent &&
                (node.parent.parent
                    ? node.parent.parent instanceof Environment
                    : false);
            if (
                isSpaceOrPar(node) &&
                isEnvironmentBody &&
                (prev === "" || next == "")
            ) {
                continue;
            }
            // we don't need a space before or after an Environment
            // but we should keep a par
            if (
                node.TYPE === "whitespace" &&
                (next instanceof Environment || prev instanceof Environment)
            ) {
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
        ASTremoveExcessSpace(ast.content);
    }
    return ast;
}

function cmpStringNode(node, cmp, substr = null) {
    // Compares `node` with `cmp` if it is a string
    // or a macro; if `substr='start'` returns true
    // if the string starts with that, if `substr='end'`
    // returns true if it ends with it.
    // If you're comparing with a macro, `cmp` must start with \
    //
    // You can also pass in a set of items for cmp. In this case,
    // substr won't work.
    if (typeof node === "undefined") {
        return false;
    }
    if (type(cmp) === "set") {
        var content = node.content;
        if (node.TYPE === "macro") {
            content = "\\" + content;
        }
        return cmp.has(content);
    }
    switch (node.TYPE) {
        case "macro":
            if (cmp.startsWith("\\")) {
                cmp = cmp.slice(1);
            } else {
                return false;
            }
        case "string":
            switch (substr) {
                case "start":
                case "starts":
                    return node.content.startsWith(cmp);
                case "end":
                case "ends":
                    return node.content.endsWith(cmp);
                default:
                    return node.content === cmp ? true : false;
            }
    }
    return false;
}

function gobbleParamsAtMacro(stream, pos = 0, stop = 1) {
    // look for macro params occuring after position `pos`.
    // gobble them and put them in the args of the macro.
    // This operation is destructive.
    //
    // If `stop` is a number, only gobble `stop` number of
    // non-whitespace items. If `stop` is a string, gobble
    // until that string is encountered.

    var origPos = pos;
    var openPos = null,
        closePos = null;
    pos++;

    if (type(stop) === "string") {
        openPos = pos;
        // we don't gobble whitespace in this case. Just look
        // for a node that matches the termination string
        while (!cmpStringNode(stream[pos], stop) && pos < stream.length) {
            pos++;
        }
        closePos = pos;
        
        var removed = stream.splice(openPos, closePos - openPos + 1);
        stream[origPos].params = removed;
        return stream;
    }

    // we need to eat a certain number of non-whitespace 
    // items
    openPos = pos;
    while (stop > 0 && pos < stream.length) {
        if ((stream[pos] || "").TYPE !== "whitespace") {
            stop--;
        }
        pos++;
    }
    closePos = pos;
    var removed = stream.splice(openPos, closePos - openPos);
    // remove any whitespace
    // XXX if we do this, "\mathbb a" becomes "\mathbba"; We don't want that,
    // so leave it up to the pretty printer to remove space
    //removed = removed.filter( a => (a || "").TYPE === "whitespace" ? false : true );
    stream[origPos].params = removed;

    return stream;
}

function gobbleArgsAtMacro(stream, pos = 0) {
    // look for macro arguments [..] occuring after position `pos`.
    // gobble them and put them in the args of the macro.
    // This operation is destructive

    var origPos = pos;
    var openPos = null,
        closePos = null;
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
    while (
        typeof stream[pos] !== "undefined" &&
        !cmpStringNode(stream[pos], "]", "end")
    ) {
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
        removed[removed.length - 1].content = cont.slice(0, cont.length - 1);
    }
    stream[origPos].args = removed;

    // if we gobbled any spaces, remove them
    if (openPos > origPos + 1) {
        var excess = openPos - origPos - 1;
        stream.splice(origPos + 1, excess);
    }

    return stream;
}

function ASTattachArgs(ast, context = {}) {
    // find macros that have optional args attached
    // to them and attach them.

    if (!ast) {
        return;
    }

    if (ast.TYPE === "nodelist") {
        for (let i = ast.length - 1; i >= 0; i--) {
            ASTattachArgs(ast[i], context);

            // attach optional arguments to \\ macro
            if (cmpStringNode(ast[i], "\\\\")) {
                gobbleArgsAtMacro(ast, i);
            }

            // attach optional arguments to \item macro
            if (cmpStringNode(ast[i], "\\item")) {
                gobbleArgsAtMacro(ast, i);
            }

            // replace \cr in math environments
            if (context.math && cmpStringNode(ast[i], "\\cr")) {
                ast[i] = new Macro("\\");
            }

            // attach params to "\mathbb" and friends
            if (cmpStringNode(ast[i], SPECIAL_MACROS.oneParam)) {
                gobbleParamsAtMacro(ast, i, 1);
            }
            
            // attach params to "\frac" and friends
            if (cmpStringNode(ast[i], SPECIAL_MACROS.twoParam)) {
                gobbleParamsAtMacro(ast, i, 2);
            }
            
            // process the tikz commands
            if (context.tikz && cmpStringNode(ast[i], SPECIAL_MACROS.tikzCommand)) {
                gobbleArgsAtMacro(ast, i);
                gobbleParamsAtMacro(ast, i, ";");
            }

        }
    } else if (ast.content) {
        if (
            ast.TYPE === "environment" ||
            ast.TYPE === "inlinemath" ||
            ast.TYPE === "displaymath" ||
            ast.TYPE === "mathenv"
        ) {
            context = {
                immediate: ast,
                math: isMathEnvironment(ast) || context.math, // once we enter a math environment, we won't leave (XXX invalid assumption...)
                tikz: isTikzEnvironment(ast, context.tikz)
            };
        }
        ASTattachArgs(ast.content, context);
    }
    return ast;
}

function inArray(node, arr=[]) {
    // returns true if `node` is in array `arr`
    if (type(arr) !== "array") {
        arr = [arr]
    }

    for (let e of arr) {
        if (cmpStringNode(node, e)) {
            return true;
        }
    }
    return false;
}

function splitTabular(ast, colSep=["&"], rowSep=["\\\\", "\\hline"]) {
    // takes a node-list and returns each row
    // in an intermediate tabular format
    var rows = [], row = [], currCol = 0, cell = new ASTNodeList();

    for (let tok of ast) {
        if (inArray(tok, colSep)) {
            // we're in a new column
            row.push({content: trimWhitespace(cell), TYPE: "cell"})
            row.push({content: tok, TYPE: "colsep"})
            currCol++
            cell = new ASTNodeList()
        } else if (inArray(tok, rowSep)) {
            // we're in a new row
            row.push({content: trimWhitespace(cell), TYPE: "cell"})
            row.push({content: tok, TYPE:"rowsep"})
            rows.push(row)
            row = []
            currCol = 0
            cell = new ASTNodeList()
        } else {
            // we're just adding to the current cell
            cell.push(tok)
        }
    }
    row.push({content: trimWhitespace(cell), TYPE:"cell"})
    rows.push(row)

    // now each row is an array of the form [cell, sep, cell, sep, cell, break]
    // that is, ever other entry *must* be a cell (even if it's empty).
    var longestRow = Math.max(...rows.map(x=>x.length))
    var widths = []
    widths.length = longestRow
    widths.fill(0)

    // turn each cell into a string
    rows.forEach(x => x.forEach(y => y.content = ""+y.content))

    for (row of rows) {
        currCol = 0;
        for (cell of row) {
            if (currCol % 2 === 1) {
                currCol++
                continue
            }
            widths[currCol] = Math.max(widths[currCol], cell.content.length)
            currCol++
        }
    }

    return [rows, widths]

}

function makeMatchableNode(node) {
    // returns a new node of the same type that 
    // will match any other node of the same type
    let ret = Object.getPrototypeOf(node);
    ret = new (ret.constructor)(WILD);
    return ret
}

function parseParBlocks(nodes) {
    // parses a list and chunks it into blocks that should be printed on their own line.
    if (type(nodes) !== "array") {
        return nodes;
    }

    var ret = new ASTNodeList;
    var par = new ASTParBlock;
    for (var node of nodes) {
        if (SPECIAL_MACROS.lineBreakers.some(x => x.equal(node))) {
            // if we encountered a macro on which we should linebrake,
            // start a new ASTParBlock
            if (par.length > 0) {
                par.parent = node.parent
                ret.push(par);
                par = new ASTParBlock;
            }
        }
        // Parbreaks should be inserted on their own, not in a ParBlock
        // it is safe to do this here because Parbreak triggers
        // the creation of a new ParBlock.
        if (node.equal(new Parbreak)) {
            ret.push(node);
        } else {
            par.push(node)
        }
    }
    if (par.length > 0) {
        par.parent = node.parent
        ret.push(par)
    }
    
    return ret
}

module.exports = {
    ASTattachArgs,
    gobbleArgsAtMacro,
    gobbleParamsAtMacro,
    cmpStringNode,
    ASTremoveExcessSpace,
    trimWhitespace,
    isSpaceOrPar,
    isMathEnvironment,
    strToAST,
    splitTabular,
    SPECIAL_MACROS,
    makeMatchableNode,
    parseParBlocks
};
