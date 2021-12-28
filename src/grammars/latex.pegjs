{
    function compare_env(g1, g2) {
        return g1.content.join("") == g2.content.join("");
    }

    function createNode(type, extra = {}) {
        const ret = { type, ...extra };
        // Add a non-enumerable location property to `ret`. Since it is
        // non-enumerable, it won't clutter up the syntax tree when printed.
        Object.defineProperty(ret, "loc", {
            value: location(),
            enumerable: false,
        });

        return ret;
    }
}

document "document" = content:token* { return createNode("root", { content }); }

token "token"
    = special_macro
    / macro
    / full_comment
    / group
    / math_shift eq:(!math_shift t:math_token { return t; })+ math_shift {
            return createNode("inlinemath", { content: eq });
        }
    / alignment_tab
    / parbreak
    / macro_parameter
    / ignore
    / number
    / whitespace
    / punctuation
    / $(!nonchar_token .)+
    // If all else fails, we allow special tokens. If one of these
    // is matched, it means there is an unbalanced group.
    / begin_group
    / end_group
    / math_shift

parbreak "parbreak"
    = (
        // Comments eat the whitespace in front of them, so if a
        // parbreak is follwed by a comment, we don't want to eat that
        // whitespace.
        sp* nl (sp* nl)+ sp* !comment_start
        / sp* nl (sp* nl)+
    ) { return createNode("parbreak"); }

math_token "math token"
    = special_macro
    / macro
    / full_comment
    / whitespace* x:group whitespace* { return x; }
    / whitespace* x:alignment_tab whitespace* { return x; }
    / whitespace* x:macro_parameter whitespace* { return x; }
    / whitespace* superscript whitespace* {
            return createNode("macro", { content: "^", escapeToken: "" });
        }
    / whitespace* subscript whitespace* {
            return createNode("macro", { content: "_", escapeToken: "" });
        }
    / ignore
    / whitespace
    / .

nonchar_token "nonchar token"
    = escape
    / "%"
    / begin_group
    / end_group
    / math_shift
    / alignment_tab
    / nl
    / macro_parameter
    / ignore
    / sp
    / punctuation
    / EOF

whitespace "whitespace"
    = (nl sp* / sp+ nl !comment_start sp* !nl / sp+) {
            return createNode("whitespace");
        }

number "number"
    = a:num+ "." b:num+ { return a.join("") + "." + b.join(""); }
    / "." b:num+ { return "." + b.join(""); }
    / a:num+ "." { return a.join("") + "."; }

special_macro "special macro" // for the special macros like \[ \] and \begin{} \end{} etc.
    // \verb|xxx| and \verb*|xxx|
    = escape
        env:("verb*" / "verb")
        e:.
        x:(!(end:. & { return end == e; }) x:. { return x; })*
        (end:. & { return end == e; }) {
            return createNode("verb", {
                env: env,
                escape: e,
                content: x.join(""),
            });
        }
    // verbatim environment
    / verbatim_environment
    // display math with \[...\]
    / begin_display_math
        x:(!end_display_math x:math_token { return x; })*
        end_display_math { return createNode("displaymath", { content: x }); }
    // inline math with \(...\)
    / begin_inline_math
        x:(!end_inline_math x:math_token { return x; })*
        end_inline_math { return createNode("inlinemath", { content: x }); }
    // display math with $$...$$
    / math_shift
        math_shift
        x:(!(math_shift math_shift) x:math_token { return x; })*
        math_shift
        math_shift { return createNode("displaymath", { content: x }); }
    // math with $...$
    / math_environment
    / environment

verbatim_environment "verbatim environment"
    = begin_env
        begin_group
        env:verbatim_env_name
        end_group
        body:(
            !(
                    end_env
                        end_env:group
                        & { return compare_env({ content: [env] }, end_env); }
                )
                x:. { return x; }
        )*
        end_env
        begin_group
        verbatim_env_name
        end_group {
            return createNode("verbatim", {
                env: env,
                content: body.join(""),
            });
        }

verbatim_env_name
    // standard verbatim enviroments. `verbatim*` must be listed first
    = "verbatim*"
    / "verbatim"
    / "filecontents*"
    / "filecontents"
    // comment environment provided by \usepackage{verbatim}
    / "comment"
    // lstlisting environment provided by \usepackage{listings}
    / "lstlisting"

macro "macro"
    = m:(escape n:char+ { return n.join(""); } / escape n:. { return n; }) {
            return createNode("macro", { content: m });
        }

group "group"
    = begin_group x:(!end_group c:token { return c; })* end_group {
            return createNode("group", { content: x });
        }

environment "environment"
    = begin_env
        env:group
        env_comment:sameline_comment?
        body:(
            !(end_env end_env:group & { return compare_env(env, end_env); })
                x:token { return x; }
        )*
        end_env
        group {
            return createNode("environment", {
                env: env.content,
                content: env_comment ? [env_comment, ...body] : body,
            });
        }

math_environment "math environment"
    = begin_env
        begin_group
        env:math_env_name
        end_group
        env_comment:sameline_comment?
        body:(
            !(
                    end_env
                        end_env:group
                        & { return compare_env({ content: [env] }, end_env); }
                )
                x:math_token { return x; }
        )*
        end_env
        begin_group
        math_env_name
        end_group {
            return createNode("mathenv", {
                env: env,
                content: env_comment ? [env_comment, ...body] : body,
            });
        }

// group that assumes you're in math mode.  If you use "\text{}" this isn't a good idea....
math_group "math group"
    = begin_group x:(!end_group c:math_token { return c; })* end_group {
            return createNode("group", { content: x });
        }

begin_display_math = escape "["

end_display_math = escape "]"

begin_inline_math = escape "("

end_inline_math = escape ")"

begin_env = escape "begin"

end_env = escape "end"

math_env_name
    = "equation*"
    / "equation"
    / "align*"
    / "align"
    / "alignat*"
    / "alignat"
    / "gather*"
    / "gather"
    / "multline*"
    / "multline"
    / "flalign*"
    / "flalign"
    / "split"
    / "math"
    / "displaymath"

// catcode 0
escape "escape" = "\\"

// catcode 1
begin_group = "{"

// catcode 2
end_group = "}"

// catcode 3
math_shift = "$"

// catcode 4
alignment_tab = "&"

// catcode 5 (linux, os x, windows)
nl "newline"
    = !"\r" "\n"
    / "\r"
    / "\r\n"

// catcode 6
macro_parameter = "#"

// catcode 7
superscript = "^"

// catcode 8
subscript = "_"

// catcode 9
ignore = "\0"

// catcode 10
sp "whitespace" = [ \t]+ { return " "; }

// catcode 11
char "letter" = c:[a-zA-Z]

// catcode 12 (other)
num "digit" = n:[0-9]

// catcode 12
punctuation "punctuation" = p:[.,;:\-\*/()!?=+<>\[\]`'\"]

// catcode 14, including the newline
comment_start = "%"

// A comment consumes any whitespace that comes before it.
// It can be the only thing on a line, or can come at the end of a line.
// A comment will consume the newline that follows it, unless that newline
// is part of a parbreak.
full_comment "full comment"
    = ownline_comment
    / sameline_comment

// A comment that appears on a line of its own
ownline_comment
    // `leading_sp` is whitespace that starts at the beginning fo a line.
    // A comment is `sameline` if it is on the same line as other content.
    // The existance of leading whitespace for a `sameline == false` comment
    // isn't important, but we record it anyways.
    //
    // We look for `(sp nl)?` at the start so that we eat excess whitespace that occurs before
    // a comment on a new line. Otherwise, the newline itself is counted as whitespace. For example:
    // ```x
    //    %comment```
    // would be parsed as "x, <whitespace (from the newline)>, comment". We don't want this. We want
    // to parse it as "x, comment".
    = (sp* nl)? leading_sp:leading_sp comment:comment {
            return createNode("comment", {
                ...comment,
                sameline: false,
                leadingWhitespace: leading_sp.length > 0,
            });
        }

// A comment that appears at the end of a line
sameline_comment
    = spaces:sp* x:comment {
            return createNode("comment", {
                ...x,
                sameline: true,
                leadingWhitespace: spaces.length > 0,
            });
        }

comment "comment"
    // A comment normally consumes the next newline and all leading whitespace.
    // The exception is if the next line consists solely of a comment. In that case,
    // consume the newline but leave the whitespace (`full_comment` will eat the
    // leading whitspace)
    = comment_start c:(!nl c:. { return c; })* &parbreak {
            return { content: c.join(""), suffixParbreak: true };
        } // parbreaks following a comment are preserved
    / comment_start
        c:(!nl c:. { return c; })*
        (nl sp* !comment_start / nl / EOF) { return { content: c.join("") }; } // if a comment is not followed by a parbreak, the newline is consumed

// Whitespace at the start of a line only
leading_sp = $(start_of_line sp*)

start_of_line
    = & {
            var loc = location();
            return loc.start.column === 1;
        }

EOF = !.
