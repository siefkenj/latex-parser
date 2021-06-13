//
// A PEG grammar for attaching arguments to tikz commands. Arguments can occur at any
// place in a tikz command after the initial macro and before the ending ";".
// If what looks like an optional argument is preceeded by a macro or suitable string,
// the arguments are attached to that macro/string. If not, a new macro with content of " "
// is created to house the arguments.
// Code to identify AST nodes must be passed into the `options` object,
// and arrays must be decorated with `.charAt`, `.charCodeAt`, and `.substring`
// methods.
//
{
    //
    // These are compatability functions used when running in the browser
    //
    // Check if the `options` object has the functions that we need.
    // If not, try to add them
    if (!options.isWhitespace) {
        function isOpenMark(node) {
            return node.type === "string" && node.content == "[";
        }

        function isCloseMark(node) {
            return node.type === "string" && node.content == "]";
        }

        function isMacro(node) {
            return node.type === "macro";
        }

        function isMacroLikeString(node) {
            return node.type === "string" && !!node.content.match(/^\w+$/);
        }

        try {
            Object.assign(options, {
                ...createMatchers([], []),
                isOpenMark,
                isCloseMark,
                isMacro,
                isMacroLikeString,
            });
        } catch (e) {
            console.warn("Error when initializing parser", e);
        }
    }
}

body
    = (command_token / args_without_macro / .)+
    / EOL { return []; }

// Things like \node[blue] and edge[loop above] are command_tokens.
command_token
    = macro:macro_like whitespace* args:args {
            return { ...macro, args: [args] };
        }

// We don't attach args to things which are not macro-like. Instead, we create
// a phantom " " (space) macro to attach the arguments to. This handles cases like
// \draw (0,0) [thick] -- (1,1);
args_without_macro
    = whitespace* args:args {
            return {
                type: "macro",
                content: " ",
                escapeToken: "",
                args: [args],
                _renderInfo: { pgfkeysArgs: true },
            };
        }

args
    = open_mark content:token* close_mark {
            return { type: "argument", content, openMark: "[", closeMark: "]" };
        }

token = !(open_mark / close_mark) x:. { return x; }

whitespace = tok:. & { return options.isWhitespace(tok); } { return tok; }

open_mark = tok:. & { return options.isOpenMark(tok); } { return tok; }

close_mark = tok:. & { return options.isCloseMark(tok); } { return tok; }

// Arguments may follow a macro or a string. If the string is an actual word
// (i.e., not a ")" symbol, etc.), we call the symbol macro-like
macro_like
    = macro
    / macro_like_string

macro
    = tok:. & { return options.isMacro(tok); } {
            return { ...tok, _renderInfo: { pgfkeysArgs: true } };
        }

// Macro-like strings get converted to macros without an escape token.
// This way, they'll render the same, but we can attach argument lists to them.
macro_like_string
    = tok:. & { return options.isMacroLikeString(tok); } {
            return {
                type: "macro",
                content: tok.content,
                escapeToken: "",
                _renderInfo: { pgfkeysArgs: true },
            };
        }

EOL = !.
