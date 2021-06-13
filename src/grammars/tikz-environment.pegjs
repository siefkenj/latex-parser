//
// A PEG grammar for processing the contents of a tikz environment. The contents
// are split into commands that end with ";".
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
        function isSemicolon(node) {
            return node.type === "string" && node.content == ";";
        }
        function isParbreak(node) {
            return node.type === "parbreak";
        }

        try {
            Object.assign(options, {
                ...createMatchers([], []),
                isSemicolon,
                isParbreak,
            });
        } catch (e) {
            console.warn("Error when initializing parser", e);
        }
    }
}

body
    = parsed_body:(parbreak / tikz_command_with_end / comment)*
        unparsed_body:.* {
            return unparsed_body
                ? [...parsed_body, ...unparsed_body]
                : parsed_body;
        }
    / EOL { return []; }

token = !(command_sep / comment) x:. { return x; }

// We don't want to have to create a new AST Node type
// to represent a Tikz command. Instead we wrap it in a an "empty"
// Macro node. The command (including the ending ";") is wrapped up in
// that macro's arguments.
tikz_command_with_end
    = whitespace* command:$(token $(comment / token)*) command_sep:command_sep {
            const ret = {
                type: "macro",
                content: "",
                escapeToken: "",
                args: [
                    {
                        type: "argument",
                        content: [...command, command_sep],
                        openMark: "",
                        closeMark: "",
                    },
                ],
                _renderInfo: {
                    hangingIndent: true,
                    inParMode: true,
                    tikzCommand: true,
                    breakAround: true,
                },
            };
            return ret;
        }
    / whitespace* command_sep:command_sep { return command_sep; }

// These rules use Javascript to do their matching
// so that they can work on AST nodes instead of strings
comment
    = same_line_comment
    / own_line_comment

same_line_comment
    = tok:. & { return options.isSameLineComment(tok); } { return tok; }

own_line_comment
    = tok:. & { return options.isOwnLineComment(tok); } { return tok; }

whitespace = tok:. & { return options.isWhitespace(tok); } { return tok; }

parbreak = tok:. & { return options.isParbreak(tok); } { return tok; }

command_sep = tok:. & { return options.isSemicolon(tok); } { return tok; }

EOL = !.
