import React from "react";
import { Controlled as CodeMirror } from "react-codemirror2";
import "codemirror/mode/stex/stex";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/pegjs/pegjs";
import "codemirror/lib/codemirror.css";
import SplitPane from "react-split-pane";
import "codemirror/addon/display/rulers";

import "./App.css";

import * as Comlink from "comlink";
/* eslint-disable import/no-webpack-loader-syntax */
import Worker from "worker-loader!./worker/parsing-worker";

import * as latexParser from "./parser-utils/latex-parser";

import PEG from "pegjs";
window.latexParser = latexParser;
window.PEG = PEG;

// Our worker that will format code in another thread.
const worker = new Worker();
const asyncFormatter = Comlink.wrap(worker);

export function DebugView(props) {
    const { texInput, textWidth } = props;
    const [currDisplay, _setCurrDisplay] = React.useState({ peggrammar: true });
    const [displayCode, _setDisplayCode] = React.useState({
        peggrammar: { code: "", options: { mode: "pegjs" } },
    });

    // Update what is currently displayed. Pass in an object like
    // `{ formatted: true }`
    function setCurrDisplay(display) {
        _setCurrDisplay((currDisplay) => ({ ...currDisplay, ...display }));
    }

    function setDisplayCode(codeInfo) {
        _setDisplayCode((displayCode) => ({ ...displayCode, ...codeInfo }));
    }

    React.useEffect(() => {
        for (const [display, active] of Object.entries(currDisplay)) {
            if (!active) {
                continue;
            }
            switch (display) {
                case "formatted":
                    asyncFormatter
                        .format(texInput, { printWidth: textWidth })
                        .then((x) =>
                            setDisplayCode({
                                formatted: {
                                    code: x,
                                    options: { mode: "stex" },
                                },
                            })
                        )
                        .catch((e) => console.warn("Failed to parse", e));
                    break;
                case "ast":
                    asyncFormatter
                        .parse(texInput)
                        .then((x) =>
                            setDisplayCode({
                                ast: {
                                    code: JSON.stringify(x, null, 4),
                                    options: { mode: "javascript" },
                                },
                            })
                        )
                        .catch((e) => console.warn("Failed to parse", e));
                    break;
                case "doc":
                    asyncFormatter
                        .parseToDoc(texInput)
                        .then((x) =>
                            setDisplayCode({
                                doc: {
                                    code: x,
                                    options: { mode: "javascript" },
                                },
                            })
                        )
                        .catch((e) => console.warn("Failed to parse", e));
                    break;
                case "parsedast":
                    asyncFormatter
                        .parseWithAstParser(texInput, {
                            parserSource: displayCode.peggrammar.code,
                        })
                        .then((x) =>
                            setDisplayCode({
                                parsedast: {
                                    code: JSON.stringify(x, null, 4),
                                    options: { mode: "javascript" },
                                },
                            })
                        )
                        .catch((e) => {
                            setDisplayCode({
                                parsedast: {
                                    code: e.message,
                                    options: { mode: "javascript" },
                                },
                            });
                            console.warn("Failed to parse", e);
                        });
                    break;
            }
        }
    }, [texInput, textWidth, currDisplay, displayCode.peggrammar]);

    const rightPanelElements = Object.entries(currDisplay)
        .map(([key, val]) => {
            if (!val) {
                return null;
            }
            const codeInfo = displayCode[key] || {
                code: "WARNING: No Code",
                options: {},
            };
            let onChange = () => {};
            if (key === "peggrammar") {
                // The peg grammar is the only thing we can edit, so it gets special treatment
                onChange = (editor, data, text) => {
                    setDisplayCode({
                        peggrammar: { code: text, options: { mode: "pegjs" } },
                    });
                };
            }
            return (
                <div className="debug-code-parent" key={key}>
                    <div className="debug-code-label">{key}</div>
                    <div style={{ flexGrow: 1 }}>
                        <div className="code-container">
                            <CodeMirror
                                value={codeInfo.code}
                                options={codeInfo.options}
                                onBeforeChange={onChange}
                            />
                        </div>
                    </div>
                </div>
            );
        })
        .filter((x) => x != null);

    // SplitPane can only have two children. If we want more,
    // we have to recursively nest.
    function createNestedSplitpanes(items) {
        if (items.length === 0) {
            return null;
        }
        if (items.length === 1) {
            return items[0];
        }
        return (
            <SplitPane split="vertical" defaultSize="50%">
                {items[0]}
                {createNestedSplitpanes(items.slice(1))}
            </SplitPane>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
                height: "100%",
            }}
        >
            <div>
                Display:{" "}
                <label>
                    <input
                        type="checkbox"
                        checked={!!currDisplay.peggrammar}
                        onChange={(e) => {
                            setCurrDisplay({ peggrammar: e.target.checked });
                        }}
                    />
                    PEG AST Grammar (for running PEG against the AST)
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={!!currDisplay.parsedast}
                        onChange={(e) => {
                            setCurrDisplay({ parsedast: e.target.checked });
                        }}
                    />
                    Parsed AST (after being run through the PEG grammar)
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={!!currDisplay.ast}
                        onChange={(e) => {
                            setCurrDisplay({ ast: e.target.checked });
                        }}
                    />
                    AST
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={!!currDisplay.doc}
                        onChange={(e) => {
                            setCurrDisplay({ doc: e.target.checked });
                        }}
                    />
                    Prettier Doc
                </label>
                <label>
                    <input
                        type="checkbox"
                        checked={!!currDisplay.formatted}
                        onChange={(e) => {
                            setCurrDisplay({ formatted: e.target.checked });
                        }}
                    />
                    Formatted
                </label>
            </div>
            <div
                style={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                }}
            >
                {createNestedSplitpanes(rightPanelElements)}
            </div>
        </div>
    );
}
