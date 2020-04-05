"use strict";

/*
 * add prettier-based formatting to the AST
 */

const { type, ESCAPE, callSuper } = require("./utils.js");
const PRETTIER = require("./prettier/doc-builders.js");
const prettierPrintDocToString = require("./prettier/doc-printer.js")
    .printDocToString;
const prettierNormalizeOptions = require("./prettier/options.js").normalize;

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

const {
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
} = require("./ast-utils.js");

/*
 * Add toPrettierDoc method to each class
 */

ASTNodeList.prototype.toPrettierDoc = function(args={root: false}) {
    if (args.root == true) {
        // we are a root node
        let pars = parseParBlocks(this);
        let doc = [], prev = null, par = new Parbreak
        // construct the Prettier doc
        for (let node of pars) {
            doc.push(node.toPrettierDoc({inParBlock: true}))
            doc.push(PRETTIER.hardline)
        }
        doc.pop()
        return PRETTIER.concat(doc)
    }

    return PRETTIER.concat([
        PRETTIER.fill([].concat.apply([], this.map(x => x.toPrettierDoc())))
    ]);
};

ArgsNode.prototype.toPrettierDoc = function() {
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
};

Environment.prototype.toPrettierDoc = function() {
    switch ("" + this.env) {
        case "parts":
        case "itemize":
        case "description":
        case "enumerate":
            var items = _processEnumerateEnvironment.call(this);
            //console.log(items, ""+this)
            items = items.map(_enumerateItemToPrettier);
            items = arrayJoin(
                items,
                PRETTIER.concat([PRETTIER.hardline, PRETTIER.hardline])
            );

            return PRETTIER.concat([
                this.envStart,
                callSuper(this, "toPrettierDoc", [], Environment),
                PRETTIER.indent(PRETTIER.concat([PRETTIER.hardline, ...items])),
                PRETTIER.hardline,
                this.envEnd
            ]);
            break;
        case "tabular":
        case "align":
        case "align*":
        case "matrix":
        case "bmatrix":
        case "pmatrix":
        case "vmatrix":
        case "Bmatrix":
        case "Vmatrix":
        case "smallmatrix":
            function getSpace(len = 1) {
                return new StringNode(" ".repeat(len));
            }
            var alignFunc = (a, width) => {
                return a + getSpace(width - ("" + a).length);
            };

            var [rows, widths] = splitTabular(this.content);

            rows = rows.map(row => {
                return row.map((cell, i) => {
                    if (cell.TYPE === "colsep") {
                        return " " + cell.content + " ";
                    } else if (cell.TYPE === "cell") {
                        return alignFunc(cell.content, widths[i])            
                    }
                    return cell.content
                })
            })

            rows = rows.map((x,i) => {
                if (i === rows.length - 1) {
                    // add a hardline to every row but the last one
                    return PRETTIER.concat(x)
                }
                return PRETTIER.concat(x.concat(PRETTIER.hardline))
            })

            return PRETTIER.concat([
                PRETTIER.hardline,
                this.envStart,
                callSuper(this, "toPrettierDoc", [], Environment),
                PRETTIER.indent(
                    PRETTIER.concat([PRETTIER.hardline].concat(rows))
                ),
                PRETTIER.hardline,
                this.envEnd
            ]);
            break;
        case "tikz":
        case "axis":
        case "scope":
            var args = ""
            if (typeof this.args !== "undefined") {
                args = _commaListGroupToPrettier(this.args, "[", "]")
            }
            return PRETTIER.concat([
                PRETTIER.hardline,
                this.envStart,
                args,
                PRETTIER.indent(
                    PRETTIER.concat([PRETTIER.hardline, this.content.toPrettierDoc()])
                ),
                PRETTIER.hardline,
                this.envEnd
            ]);
            break;

    }

    var comment = PRETTIER.concat([]);
    var content = this.content;
    if (typeof content[0] !== "undefined" && content[0].TYPE === "comment") {
        comment = content[0].toPrettierDoc()
        content = content.slice(1)
    }
    return PRETTIER.concat([
        this.envStart,
        callSuper(this, "toPrettierDoc", [], Environment), comment,
        PRETTIER.indent(
            PRETTIER.concat([PRETTIER.hardline, content.toPrettierDoc({root: true})])
        ),
        PRETTIER.hardline,
        this.envEnd
    ]);
};

Macro.prototype.toPrettierDoc = function() {
    let start = ESCAPE + this.content;
    // there are some special macros that
    // need special formatting
    //switch (this.content) {
    //    case "usepackage":
    //    case "newcommand":
    //        return PRETTIER.concat([PRETTIER.hardline, start]);
    //        break;
    //    case "section":
    //    case "subsection":
    //    case "subsubsection":
    //        return PRETTIER.concat([PRETTIER.hardline, start]);
    //        break;
    //}
    if (this.params.length === 0) {
        return start + this.argsString;
    }
    
    if (SPECIAL_MACROS.oneParam.has(start)) {
        // we should remove all spaces from the params and
        // wrap it in a group.
        var params = this.params.filter( a => isSpaceOrPar(a) ? false : true );
        if (typeof params[0] !== "undefined" && params[0].TYPE !== "group") {
            params = new ASTNodeList(new Group(params));
        }

        // some special macros, we want to print their args differently
        switch (start) {
            case "\\usetikzlibrary":
            case "\\pgfkeys":
            case "\\pgfplotsset":
            case "\\tikzset":
                var paramsPrettier = _commaListGroupToPrettier(params[0])
                return PRETTIER.concat([start + this.argsString, paramsPrettier]);
        }
        return PRETTIER.concat([start + this.argsString, params.toPrettierDoc()]);
    }
    if (SPECIAL_MACROS.tikzCommand.has(start)) {
        // we're a tikz command inside a tikz environment
        
        // make sure there is one space before the params start
        // and no spaces before the ";"
        var params = this.params;
        var terminator = params.pop();
        params = trimWhitespace(params);
        params.push(terminator);
        params.unshift(new Whitespace);
        return PRETTIER.concat([start + this.argsString, PRETTIER.indent(this.params.toPrettierDoc())])
    }

    return PRETTIER.concat([start + this.argsString, this.params.toPrettierDoc()]);
};

Parbreak.prototype.toPrettierDoc = function(args={inParBlock: false}) {
    if (args.inParBlock) {
        return ""
    }
    return PRETTIER.concat([PRETTIER.hardline, PRETTIER.hardline]);
};

Whitespace.prototype.toPrettierDoc = function() {
    return PRETTIER.line;
};

Subscript.prototype.toPrettierDoc = function() {
    if (this.content.TYPE === "group") {
        return PRETTIER.concat(["_", this.content.toPrettierDoc()]);
    }
    return PRETTIER.concat([
        "_{",
        trimWhitespace(this.content).toPrettierDoc(),
        "}"
    ]);
};

Superscript.prototype.toPrettierDoc = function() {
    if (this.content.TYPE === "group") {
        return PRETTIER.concat(["^", this.content.toPrettierDoc()]);
    }
    return PRETTIER.concat([
        "^{",
        trimWhitespace(this.content).toPrettierDoc(),
        "}"
    ]);
};

InlineMath.prototype.toPrettierDoc = function() {
    return PRETTIER.concat([
        "$",
        trimWhitespace(this.content).toPrettierDoc(),
        "$"
    ]);
};

DisplayMath.prototype.toPrettierDoc = function() {
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
};

Group.prototype.toPrettierDoc = function() {
    return PRETTIER.concat(["{", this.content.toPrettierDoc(), "}"]);
};

Verbatim.prototype.toPrettierDoc = function() {
    return PRETTIER.concat(["" + this]);
};

Verb.prototype.toPrettierDoc = Verbatim.prototype.toPrettierDoc;

CommentEnv.prototype.toPrettierDoc = Verbatim.prototype.toPrettierDoc;

CommentNode.prototype.toPrettierDoc = function() {
    if (this.sameline) {
        return PRETTIER.concat([PRETTIER.lineSuffix("%" + this.content), PRETTIER.hardline])
    }
    return PRETTIER.concat([
        PRETTIER.hardline,
        "%",
        "" + this.content,
        PRETTIER.hardline
    ]);
};

StringNode.prototype.toPrettierDoc = function() {
    return this.content;
};

ArgList.prototype.toPrettierDoc = function() {
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
};

function _processEnumerateEnvironment() {
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

function _enumerateItemToPrettier(i) {
    if (i.length === 0) {
        return PRETTIER.concat([])
    }
    var head = i[0];
    var rest = new ASTNodeList(i.slice(1));

    return PRETTIER.concat([
        head.toPrettierDoc(),
        PRETTIER.indent(rest.toPrettierDoc())
    ]);
}

function _commaListGroupToPrettier(group, left="{", right="}") {
    // take a group whose items are separated by commas
    // and format them in prettier syntax

    var [arr, toks] = splitOn(group.content, ',');
    arr = arr.map(trimWhitespace);
    var items = [PRETTIER.indent(arr[0].toPrettierDoc())]
    for (let a of arr.slice(1)) {
        items = items.concat([",", PRETTIER.line])
        items = items.concat([PRETTIER.indent(a.toPrettierDoc())])
    }
    return PRETTIER.group(PRETTIER.concat([left,
        PRETTIER.indent(PRETTIER.concat([
            PRETTIER.softline,
            PRETTIER.concat(items),
        ])),
        PRETTIER.softline,
        right
    ]
    ))

}

function splitOn(arr, tok) {
    // splits `arr` based on `tok`.
    // `tok` can be a string or an ASTNode
    // or an array of things to split on

    if (type(tok) === "array") {
        tok = tok.map(strToAST);
    } else {
        tok = [strToAST(tok)];
    }

    var ret = new ASTNodeList(),
        toks = new ASTNodeList();
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
        if (typeof tok !== "undefined") {
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

module.exports.prettierNormalizeOptions = prettierNormalizeOptions;
module.exports.prettierPrintDocToString = prettierPrintDocToString;
module.exports.prettierPrintDoc = (doc, opts) => {
    opts = prettierNormalizeOptions(opts);
    return prettierPrintDocToString(doc, opts);
};
module.exports.utils = {
    isMathEnvironment,
    isSpaceOrPar,
    cmpStringNode,
    trimWhitespace,
    strToAST
};

if (typeof window !== "undefined") {
    window.exports = module.exports;
}
