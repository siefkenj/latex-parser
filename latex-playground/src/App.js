import React from "react";
import { Controlled as CodeMirror } from "react-codemirror2";
import "codemirror/mode/stex/stex";
import "codemirror/mode/javascript/javascript";
import "codemirror/lib/codemirror.css";
import SplitPane from "react-split-pane";
import "codemirror/addon/display/rulers";

import "./App.css";

import { CodeMirrorPanel } from "./CodeMirrorPanel.js";

import * as Comlink from "comlink";
/* eslint-disable import/no-webpack-loader-syntax */
import Worker from "worker-loader!./worker/parsing-worker";

import * as latexParser from "./parser-utils/latex-parser";
import { AstView } from "./ast-view";
window.LP = latexParser;

const DEFAULT_INPUT_TEXT = String.raw`\begin{enumerate}
    \item[55,4] Hi there
\item$e^2$ is math mode! \[\begin{matrix}12&3^e\\pi&0\end{matrix}\]
\end{enumerate}`;

// Our worker that will format code in another thread.
const worker = new Worker();
const asyncFormatter = Comlink.wrap(worker);

function App() {
    const [textWidth, setTextWidth] = React.useState(80);
    const [currDisplay, setCurrDisplay] = React.useState("formatted");
    const [texInput, setTexInput] = React.useState(DEFAULT_INPUT_TEXT);
    const [texOutput, setTexOutput] = React.useState("");
    const [texParsed, setTexParsed] = React.useState([]);
    const [prettierDoc, setPrettierDoc] = React.useState("");

    React.useEffect(() => {
        switch (currDisplay) {
            case "formatted":
                asyncFormatter
                    .format(texInput, { printWidth: textWidth })
                    .then((x) => setTexOutput(x))
                    .catch((e) => console.warn("Failed to parse", e));
                break;
            case "ast":
            case "json":
                asyncFormatter
                    .parse(texInput)
                    .then((x) => setTexParsed(x))
                    .catch((e) => console.warn("Failed to parse", e));
                break;
            case "doc":
                asyncFormatter
                    .parseToDoc(texInput)
                    .then((x) => setPrettierDoc(x))
                    .catch((e) => console.warn("Failed to parse", e));
                break;
        }
    }, [texInput, textWidth, currDisplay]);

    let rightPanel = null;
    if (currDisplay === "formatted") {
        rightPanel = (
            <CodeMirror
                value={texOutput}
                options={{ mode: "stex", rulers: [textWidth] }}
                onBeforeChange={(editor, data, value) => setTexOutput(value)}
            />
        );
    }
    if (currDisplay === "ast") {
        rightPanel = <AstView ast={texParsed} />;
    }
    if (currDisplay === "json") {
        rightPanel = (
            <CodeMirror
                value={JSON.stringify(texParsed, null, 4)}
                options={{ mode: "javascript" }}
            />
        );
    }
    if (currDisplay === "doc") {
        rightPanel = (
            <CodeMirror value={prettierDoc} options={{ mode: "javascript" }} />
        );
    }

    return (
        <div className="App">
            <div className="options-bar">
                <input
                    type="number"
                    value={textWidth}
                    onChange={(e) => setTextWidth(parseInt(e.target.value, 10))}
                />{" "}
                Display:{" "}
                <select
                    onChange={(e) => setCurrDisplay(e.target.value)}
                    value={currDisplay}
                >
                    <option value="formatted">Formatted Code</option>
                    <option value="ast">AST (Abstract Syntax Tree)</option>
                    <option value="json">
                        JSON AST (Abstract Syntax Tree)
                    </option>
                    <option value="doc">
                        Prettier Doc (AST for formatting)
                    </option>
                </select>
            </div>
            <div className="tex-section">
                <SplitPane split="vertical" minSize={200} defaultSize="50%">
                    <div className="code-container">
                        <CodeMirrorPanel
                            lineNumbers={true}
                            showCursorWhenSelecting={true}
                            tabSize={4}
                            rulerColor="#eeeeee"
                            mode="stex"
                            value={texInput}
                            onChange={setTexInput}
                            codeSample={DEFAULT_INPUT_TEXT}
                        />
                    </div>
                    <div className="code-container">{rightPanel}</div>
                </SplitPane>
            </div>
        </div>
    );
}

export default App;
