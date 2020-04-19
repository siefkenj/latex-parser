import React from "react";
import { printRaw } from "./parser-utils/latex-parser";

function Captioned({ caption, children }) {
    return (
        <div className="ast-captioned">
            <div className="ast-captioned-caption">{caption}</div>
            <div className="ast-captioned-body">{children}</div>
        </div>
    );
}

function Node(props) {
    return (
        <Captioned caption="">
            <span className="ast-node">{"" + props.value}</span>
        </Captioned>
    );
}
function Whitespace(props) {
    return (
        <Captioned caption="">
            <span className="ast-node">&nbsp;</span>
        </Captioned>
    );
}
function Parbreak(props) {
    return (
        <React.Fragment>
            <br />
            <Captioned caption="\par">
                <span className="ast-node">&nbsp;</span>
            </Captioned>
            <br />
        </React.Fragment>
    );
}
function InlineMath({ children }) {
    return (
        <Captioned caption="$...$">
            <span className="ast-node">
                <span className="ast-control-symbol">$</span>
                {children}
                <span className="ast-control-symbol">$</span>
            </span>
        </Captioned>
    );
}
function Superscript({ children }) {
    return (
        <Captioned caption="^">
            <span className="ast-node">
                <span className="ast-control-symbol">^</span>
                {children}
            </span>
        </Captioned>
    );
}
function Subscript({ children }) {
    return (
        <Captioned caption="_">
            <span className="ast-node">
                <span className="ast-control-symbol">_</span>
                {children}
            </span>
        </Captioned>
    );
}
function Group({ children }) {
    return (
        <Captioned caption="{...}">
            <span className="ast-node">
                <span className="ast-control-symbol">{"{"}</span>
                {children}
                <span className="ast-control-symbol">{"}"}</span>
            </span>
        </Captioned>
    );
}
function DisplayMath({ children }) {
    return (
        <Captioned caption={"\\[...\\]"}>
            <span className="ast-node">
                <span className="ast-control-symbol">\[</span>
                {children}
                <span className="ast-control-symbol">\]</span>
            </span>
        </Captioned>
    );
}
function Macro({ name, args }) {
    return (
        <Captioned caption={"macro"}>
            <span className="ast-node">
                <span className="ast-control-symbol">\</span>
                {name}
                {args}
            </span>
        </Captioned>
    );
}
function Verb({ escape, content }) {
    return (
        <Captioned caption={`\\verb${escape}...${escape}`}>
            <span className="ast-node">
                <span className="ast-control-symbol">\verb{escape}</span>
                <span className="ast-verb">{content}</span>
                <span className="ast-control-symbol">{escape}</span>
            </span>
        </Captioned>
    );
}
function Verbatim({ content }) {
    return (
        <Captioned caption={`verbatim env`}>
            <span className="ast-node">
                <span className="ast-control-symbol">
                    {"\\begin{verbatim}"}
                </span>
                <span className="ast-verb">{content}</span>
                <span className="ast-control-symbol">{"\\end{verbatim}"}</span>
            </span>
        </Captioned>
    );
}
function CommentEnv({ content }) {
    return (
        <Captioned caption={`comment env`}>
            <span className="ast-node">
                <span className="ast-control-symbol">{"\\begin{comment}"}</span>
                <span className="ast-verb">{content}</span>
                <span className="ast-control-symbol">{"\\end{comment}"}</span>
            </span>
        </Captioned>
    );
}
function Comment({ sameline, content }) {
    const caption = sameline ? "comment (sameline)" : "comment";
    return (
        <React.Fragment>
            <Captioned caption={caption}>
                <span className="ast-node ast-comment">
                    <span className="ast-control-symbol">{"%"}</span>
                    {"" + content}
                </span>
            </Captioned>
            <br />
        </React.Fragment>
    );
}
function Environment({ name, args, children }) {
    return (
        <div className="ast-environment-container">
            <Captioned caption={`env (${name})`}>
                <span className="ast-node">
                    <span className="ast-control-symbol">
                        {`\\begin{${name}}`}
                    </span>
                    {args}
                    <span className="ast-env">{children}</span>
                    <span className="ast-control-symbol">{`\\end{${name}}`}</span>
                </span>
            </Captioned>
        </div>
    );
}
function Argument({ children, openMark, closeMark }) {
    return (
        <div className="ast-args-container">
            <Captioned caption="args">
                <span className="ast-node">
                    <span className="ast-control-symbol">{openMark}</span>
                    <span className="ast-args">{children}</span>
                    <span className="ast-control-symbol">{closeMark}</span>
                </span>
            </Captioned>
        </div>
    );
}
function MathEnv({ name, children }) {
    return <Environment name={name}>{children}</Environment>;
}

//
//
//

function unwrapString(node) {
    if (typeof node === "string") {
        return node;
    }
    if (node.type === "string") {
        return node.content;
    }
    console.warn("Trying to unwrap non-string node", node);
    return "" + node;
}

function renderTree(ast, currentDepth = 0) {
    if (!ast) {
        //console.warn("Encountered empty AST");
        return null;
    }
    if (typeof ast === "string") {
        return <Node value={ast} />;
    }
    if (Array.isArray(ast)) {
        return ast.map((x, i) => (
            <React.Fragment key={`${currentDepth}-${i}`}>
                {renderTree(x, currentDepth)}
            </React.Fragment>
        ));
    }

    // XXX hack until the parser uses lowercase names
    ast.type = ast.type || ast.TYPE;
    switch (ast.type) {
        case "string":
            return <Node value={unwrapString(ast.content)} />;
        case "whitespace":
            return <Whitespace />;
        case "parbreak":
            return <Parbreak />;
        case "inlinemath":
            return (
                <InlineMath>
                    {renderTree(ast.content, currentDepth + 1)}
                </InlineMath>
            );
        case "macro":
            return (
                <Macro
                    name={unwrapString(ast.content)}
                    args={renderTree(ast.args, currentDepth + 1)}
                />
            );
        case "superscript":
            return (
                <Superscript>
                    {renderTree(ast.content, currentDepth + 1)}
                </Superscript>
            );
        case "subscript":
            return (
                <Subscript>
                    {renderTree(ast.content, currentDepth + 1)}
                </Subscript>
            );
        case "group":
            return <Group>{renderTree(ast.content, currentDepth + 1)}</Group>;
        case "verb":
            return (
                <Verb escape={ast.escape} content={unwrapString(ast.content)} />
            );
        case "verbatim":
            return <Verbatim content={unwrapString(ast.content)} />;
        case "displaymath":
            return (
                <DisplayMath>
                    {renderTree(ast.content, currentDepth + 1)}
                </DisplayMath>
            );
        case "environment":
            return (
                <Environment
                    name={printRaw(ast.env)}
                    args={renderTree(ast.args, currentDepth + 1)}
                >
                    {renderTree(ast.content, currentDepth + 1)}
                </Environment>
            );
        case "argument":
            return (
                <Argument openMark={ast.openMark} closeMark={ast.closeMark}>
                    {renderTree(ast.content, currentDepth + 1)}
                </Argument>
            );
        case "mathenv":
            return (
                <MathEnv name={ast.env}>
                    {renderTree(ast.content, currentDepth + 1)}
                </MathEnv>
            );
        case "commentenv":
            return <CommentEnv content={unwrapString(ast.content)} />;
        case "comment":
            return (
                <Comment
                    sameline={ast.sameline}
                    content={unwrapString(ast.content)}
                />
            );
    }
    console.warn("Found unmatched node", ast);
    return "" + ast;
}

export function AstView({ ast, ...rest }) {
    try {
        const rendered = renderTree(ast);

        return <div>{rendered}</div>;
    } catch (e) {
        console.error(e);
        return "Error Rendering";
    }
}
