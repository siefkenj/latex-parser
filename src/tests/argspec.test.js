import util from "util";

import * as argspecParser from "../libs/argspec-parser";

/* eslint-env jest */

// Make console.log pretty-print by default
export const origLog = console.log;
console.log = (...args) => {
    origLog(...args.map((x) => util.inspect(x, false, 10, true)));
};

describe("Macro arguments argspec test", () => {
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
            expect(argspecParser.printRaw(ast, true)).toEqual(spec);
        });
    }
});
