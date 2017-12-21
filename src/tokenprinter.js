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
