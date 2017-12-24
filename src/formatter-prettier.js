"use strict";

/*
 * add prettier-based formatting to the AST
 */

const {type, ESCAPE, callSuper} = require("./utils.js")
const PRETTIER = require("./prettier/doc-builders.js")
const prettierPrintDocToString = require("./prettier/doc-printer.js").printDocToString;
const prettierNormalizeOptions = require("./prettier/options.js").normalize;

const latexAst = __webpack_require__(4)
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




/*
 * Add toPrettierDoc method to each class
 */

ASTNodeList.prototype.toPrettierDoc = function() {
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
        switch (""+this.env) {
            case "parts":
            case "itemize":
            case "description":
            case "enumerate":
                var items = _processEnumerateEnvironment.call(this)
                items = items.map(_enumerateItemToPrettier)
                items = arrayJoin(items, PRETTIER.concat([PRETTIER.hardline, PRETTIER.hardline]))

                return PRETTIER.concat([
                    PRETTIER.hardline,
                    this.envStart,
                    callSuper(this, "toPrettierDoc"),
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
                    callSuper(this,"toPrettierDoc"),
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
            callSuper(this, "toPrettierDoc"),
            PRETTIER.indent(
                PRETTIER.concat([
                    PRETTIER.hardline,
                    this.content.toPrettierDoc()
                ])
            ),
            PRETTIER.hardline,
            this.envEnd
        ]);
    return "" + this
};

Macro.prototype.toPrettierDoc = function() {
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
};

Parbreak.prototype.toPrettierDoc = function() {
        return PRETTIER.concat([PRETTIER.hardline, PRETTIER.hardline]);
};

Whitespace.prototype.toPrettierDoc = function() {
    return PRETTIER.line
};

Subscript.prototype.toPrettierDoc = function() {
        if (this.content.TYPE === "group") {
            return PRETTIER.concat(["_", this.content.toPrettierDoc()]);
        }
        return PRETTIER.concat(["_{", trimWhitespace(this.content).toPrettierDoc(), "}"]);
};

Subscript.prototype.toPrettierDoc = function() {
        if (this.content.TYPE === "group") {
            return PRETTIER.concat(["^", this.content.toPrettierDoc()]);
        }
        return PRETTIER.concat(["^{", trimWhitespace(this.content).toPrettierDoc(), "}"]);
};

InlineMath.prototype.toPrettierDoc = function() {
        return PRETTIER.concat(["$", trimWhitespace(this.content).toPrettierDoc(), "$"]);
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
            return PRETTIER.concat(["%", "" + this.content, PRETTIER.hardline]);
        }
        return PRETTIER.concat([
            PRETTIER.hardline,
            "%",
            "" + this.content,
            PRETTIER.hardline
        ]);
};

StringNode.prototype.toPrettierDoc = function() {
    return this.content
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





 function   _processEnumerateEnvironment() {
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

 function   _enumerateItemToPrettier(i) {
        var head = i[0];
        var rest = new ASTNodeList(i.slice(1));

        return PRETTIER.concat([
            head.toPrettierDoc(),
            PRETTIER.indent(rest.toPrettierDoc())
        ]);
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











module.exports.prettierNormalizeOptions = prettierNormalizeOptions
module.exports.prettierPrintDocToString = prettierPrintDocToString
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
}

if (typeof window !== 'undefined') {
    window.exports = module.exports
}

