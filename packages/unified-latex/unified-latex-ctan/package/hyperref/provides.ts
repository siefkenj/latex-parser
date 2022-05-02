import { MacroInfoRecord, EnvInfoRecord } from "../../../unified-latex-types";

export const macros: MacroInfoRecord = {
    hypersetup: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    href: { signature: "o m m" },
    url: { signature: "m" },
    nolinkurl: { signature: "m" },
    hyperbaseurl: { signature: "m" },
    hyperimage: { signature: "m m" },
    hyperdef: { signature: "m m m" },
    hyperref: { signature: "o m" },
    hyperlink: { signature: "m m" },
    hypertarget: { signature: "m m" },
    autoref: { signature: "s m" },
    pageref: { signature: "s m" },
    autopageref: { signature: "s m" },
    pdfstringdef: { signature: "m m" },
    pdfbookmark: { signature: "o m m" },
    currentpdfbookmark: { signature: "m m" },
    subpdfbookmark: { signature: "m m" },
    belowpdfbookmark: { signature: "m m" },
    texorpdfstring: { signature: "m m" },
    thispdfpagelabel: { signature: "m" },
    hypercalcbp: { signature: "m" },
};

export const environments: EnvInfoRecord = {};
