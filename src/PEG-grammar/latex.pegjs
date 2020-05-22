{
    function compare_env(g1,g2) {
        return g1.content.join("") == g2.content.join("");
    }
}

document "document"
  = (token)*

token "token"
  = special_macro
  / macro
  / full_comment
  / group
  / math_shift eq:(!math_shift t:math_token {return t})+ math_shift {return {type:"inlinemath", content: eq}}
  / alignment_tab
  / parbreak
  / macro_parameter
  / superscript
  / subscript
  / ignore
  / number
  / whitespace
  / punctuation
  / x:(!nonchar_token x:. {return x})+ {return x.join("")}

parbreak "parbreak"
  = sp* nl sp* nl+ sp* {return {type:"parbreak"}}

math_token "math token"
  = special_macro
  / macro
  / x:full_comment {return x}
  / whitespace* x:group whitespace* {return x}
  / whitespace* x:alignment_tab whitespace* {return x}
  / whitespace* x:macro_parameter whitespace* {return x}
  / whitespace* superscript whitespace* x:math_token {return {type:"superscript", content:x}}
  / whitespace* subscript whitespace* x:math_token {return {type:"subscript", content:x}}
  / ignore
  / whitespace
  / .

args_token "args token"
  = special_macro
  / macro
  / full_comment
  / group
  / math_shift eq:(!math_shift t:math_token {return t})+ math_shift {return {type:"inlinemath", content: eq}}
  / alignment_tab
  / sp* nl sp* nl+ sp* {return {type:"parbreak"}}
  / macro_parameter
  / superscript
  / subscript
  / ignore
  / number
  / whitespace
  / punctuation
  / x:(!(nonchar_token / "," / "]") x:. {return x})+ {return x.join("")}


nonchar_token "nonchar token"
  = escape
  / "%"
  / begin_group
  / end_group
  / math_shift
  / alignment_tab
  / nl
  / macro_parameter
  / superscript
  / subscript
  / ignore
  / sp
  / punctuation
  / EOF

whitespace "whitespace"
  = (nl sp* / sp+ nl !comment sp* !nl / sp+) {return {type: "whitespace"}}
  
number "number"
  = a:num+ "." b:num+ {return a.join("") + "." + b.join("")}
  / "." b:num+ {return "." + b.join("")}
  / a:num+ "." {return a.join("") + "."}

special_macro "special macro" // for the special macros like \[ \] and \begin{} \end{} etc.
    // \verb|xxx| and \verb*|xxx|
  = escape env:("verb*" / "verb") e:. x:(!(end:. & {return end == e}) x:. {return x})* (end:. & {return end == e}) 
      {
        	return {type:"verb", env: env, escape:e, content:x.join("")}
      }
    // verbatim environment
  / escape "begin{verbatim}" x:(!(escape "end{verbatim}") x:. {return x})* escape "end{verbatim}"
      {
        	return {type: "verbatim", env: "verbatim", content:x.join("")}
      }
    // verbatim* environment
  / escape "begin{verbatim*}" x:(!(escape "end{verbatim*}") x:. {return x})* escape "end{verbatim*}"
      {
        	return {type: "verbatim", env: "verbatim*", content:x.join("")}
      }
    // comment environment provided by \usepackage{verbatim}
  / escape "begin{comment}" x:(!(escape "end{comment}") x:. {return x})* escape "end{comment}"
      {
        	return {type: "verbatim", env: "comment", content: x.join("")}
      }
    // lstlisting environment provided by \usepackage{listings}
  / escape "begin{lstlisting}" x:(!(escape "end{lstlisting}") x:. {return x})* escape "end{lstlisting}"
      {
        	return {type: "verbatim", env: "lstlisting", content: x.join("")}
      }
    //display math with \[...\]
  / begin_display_math x:(!end_display_math x:math_token {return x})* end_display_math
      {
        	return {type: "displaymath", content:x}
      }
    //inline math with \(...\)
  / begin_inline_math x:(!end_inline_math x:math_token {return x})* end_inline_math
      {
        	return {type: "inlinemath", content:x}
      }
    //display math with $$ $$
  / math_shift math_shift x:(!(math_shift math_shift) x:math_token {return x})* math_shift math_shift
      {
        	return {type: "displaymath", content:x}
      }
  / math_environment
  / environment
  
  
macro "macro" 
  = m:(escape n:char+ {return n.join("")}
  / escape n:. {return n}) {return {type:"macro", content:m}}

group "group"
  = begin_group x:(!end_group c:token {return c})* end_group {return {type:"group", content:x}}


argument_list "argument list"
  = whitespace* "[" body:(!"]" x:("," / args_token) {return x})* "]" {return {type: "argument", content: body, openMark: "[", closeMark: "]"}}


environment "environment"
  = begin_env env:group args:argument_list?
  			  env_comment:env_comment?
  			  body:(
              	!(end_env end_env:group & {return compare_env(env,end_env)})
                x:token {return x}
              )* 
    end_env group {
    	return {
        	type:"environment",
            env:env.content,
            args:args,
            content: env_comment ? [env_comment, ...body] : body
        }
    }
    
math_environment "math environment"
  = begin_env begin_group env:math_env_name end_group
  				env_comment:env_comment?
    			body:(
                	!(end_env end_env:group & {return compare_env({content:[env]},end_env)})
                	x:math_token {return x}
                )*
    end_env begin_group math_env_name end_group {
    	return {
        		type:"mathenv",
                env:env,
                content: env_comment ? [env_comment, ...body] : body
            }
        }


math_group "math group"  // group that assumes you're in math mode.  If you use "\text{}" this isn't a good idea....
  = begin_group x:(!end_group c:math_token {return c})* end_group {return {type:"group", content:x}}

full_comment "full comment" 		// comment that detects whether it is at the end of a line or on a new line
  = start_of_line x:comment {return {type:"comment", content:x, sameline:false}}
  / leading_sp x:comment {return {type:"comment", content:x, sameline:false, leadingWhitespace: true}}
  / sp* nl leading_sp? x:comment_and_parbreak {return {type: "comment", content: x, sameline: false, suffixParbreak: true}}
  / sp* nl leading_sp? x:comment {return {type:"comment", content:x, sameline:false}}
  / x:comment_and_parbreak {return {type: "comment", content: x, sameline: true, suffixParbreak: true}}
  / x:comment {return {type:"comment", content:x, sameline:true}}

env_comment "environment comment" =
	sp:sp* comment:comment {
       return { type: "comment", content: comment, sameline: true, leadingWhitespace: sp.length > 0 }
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


escape "escape" = "\\"                             // catcode 0
begin_group     = "{"                              // catcode 1
end_group       = "}"                              // catcode 2
math_shift      = "$"                              // catcode 3
alignment_tab   = "&"                              // catcode 4
nl    "newline" = !'\r''\n' / '\r' / '\r\n'        // catcode 5 (linux, os x, windows)
macro_parameter = "#"                              // catcode 6
superscript     = "^"                              // catcode 7
subscript       = "_"                              // catcode 8
ignore          = "\0"                             // catcode 9
sp          "whitespace"   =   [ \t]+ { return " "}// catcode 10
char        "letter"       = c:[a-zA-Z]            // catcode 11
num         "digit"        = n:[0-9]               // catcode 12 (other)
punctuation "punctuation" = p:[.,;:\-\*/()!?=+<>\[\]]   // catcode 12
// catcode 14, including the newline
comment_start = "%"
comment_and_parbreak
  = comment_start c:(!nl c:. {return c})* &parbreak {return c.join("")} // parbreaks following a comment are preserved
comment "comment"
	// A comment normally consumes the next newline and all leading whitespace.
    // The exception is if the next line consists solely of a comment. In that case,
    // consume the newline but leave the whitespace (`full_comment` will eat the
    // leading whitspace)
  = comment_start  c:(!nl c:. {return c})* (nl sp* !comment_start / nl / EOF) {return c.join("")} // if a comment is not followed by a parbreak, the newline is consumed

// Whitespace at the start of a line only
leading_sp = 
	start_of_line sp+ { return " " }
    
start_of_line =
	& {
      var loc = location();
      return loc.start.column === 1
    }

EOF             = !.

