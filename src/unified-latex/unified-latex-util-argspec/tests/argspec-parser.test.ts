import { VFile } from "unified-lint-rule/lib";
import util from "util";
import * as argspecParser from "..";

/* eslint-env jest */

// Make console.log pretty-print by default
const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

function removeWhitespace(x: string) {
    return x.replace(/\s+/g, "");
}

describe("unified-latex-util-argspec", () => {
    let value: string | undefined;
    let file: VFile | undefined;

    const SPEC_STRINGS = [
        "",
        "o m",
        "o m o !o m",
        "!o r() m",
        "O{somedefault} m o",
        "m e{^}",
        "m e{_^}",
        "s m",
        "v!",
        "d++ D--{def}",
        "O{nested{defaults}}",
        "m ta o o",
    ];

    for (const spec of SPEC_STRINGS) {
        it(`parses xparse argument specification string "${spec}"`, () => {
            const ast = argspecParser.parse(spec);
            expect(ast).toMatchSnapshot();
            expect(argspecParser.printRaw(ast, true)).toEqual(spec);
        });
    }
});
