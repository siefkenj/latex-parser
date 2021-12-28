import { trim } from "../libs/ast";
import { cleanEnumerateBody } from "../libs/macro-utils";
import { SpecialEnvSpec, SpecialMacroSpec } from "./types";

export const macros: SpecialMacroSpec = {
    // Special
    "\\": { signature: "!s o" },
    _: { signature: "m", escapeToken: "" },
    "^": { signature: "m", escapeToken: "" },
    // \newcommand arg signature from https://www.texdev.net/2020/08/19/the-good-the-bad-and-the-ugly-creating-document-commands
    // List can be found in latex2e.pdf "An unofficial reference manual"
    newcommand: {
        signature: "s +m o +o +m",
        renderInfo: { breakAround: true },
    },
    renewcommand: {
        signature: "s +m o +o +m",
        renderInfo: { breakAround: true },
    },
    providecommand: {
        signature: "s +m o +o +m",
        renderInfo: { breakAround: true },
    },
    // Counters
    newcounter: {
        signature: "m o",
        renderInfo: { breakAround: true },
    },
    usecounter: {
        signature: "m",
    },
    setcounter: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    addtocounter: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    stepcounter: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    refstepcounter: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    // Lengths
    newlength: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    addtolength: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    settodepth: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    settoheight: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    settowidth: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    // Spaces
    stretch: { signature: "m" },
    hspace: { signature: "s m" },
    vspace: { signature: "s m", renderInfo: { breakAround: true } },
    vfill: { renderInfo: { breakAround: true } },
    indent: { renderInfo: { breakAround: true } },
    phantom: { signature: "m" },
    vphantom: { signature: "m" },
    hphantom: { signature: "m" },
    noindent: { renderInfo: { breakAround: true } },
    smallskip: { renderInfo: { breakAround: true } },
    medskip: { renderInfo: { breakAround: true } },
    bigskip: { renderInfo: { breakAround: true } },
    smallbreak: { renderInfo: { breakAround: true } },
    medbreak: { renderInfo: { breakAround: true } },
    bigbreak: { renderInfo: { breakAround: true } },
    newline: { renderInfo: { breakAround: true } },
    linebreak: { signature: "o", renderInfo: { breakAround: true } },
    nolinebreak: { signature: "o", renderInfo: { breakAround: true } },
    clearpage: { renderInfo: { breakAround: true } },
    cleardoublepage: { renderInfo: { breakAround: true } },
    newpage: { renderInfo: { breakAround: true } },
    enlargethispage: { signature: "s", renderInfo: { breakAround: true } },
    pagebreak: { signature: "o", renderInfo: { breakAround: true } },
    nopagebreak: { signature: "o", renderInfo: { breakAround: true } },
    // Boxes
    newsavebox: {
        signature: "m",
        renderInfo: { breakAround: true },
    },
    sbox: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    savebox: {
        signature: "m o o m",
        renderInfo: { breakAround: true },
    },
    mbox: { signature: "m" },
    makebox: { signature: "o o m", renderInfo: { breakAround: true } },
    fbox: { signature: "m" },
    framebox: { signature: "o o m", renderInfo: { breakAround: true } },
    frame: { signature: "m", renderInfo: { breakAround: true } },
    parbox: { signature: "o o o m m", renderInfo: { breakAround: true } },
    raisebox: { signature: "m o o m" },
    marginpar: { signature: "o m", renderInfo: { breakAround: true } },
    colorbox: { signature: "o m m", renderInfo: { breakAround: true } },
    fcolorbox: { signature: "o m m", renderInfo: { breakAround: true } },
    rotatebox: { signature: "o m m" },
    scalebox: { signature: "m o m" },
    reflectbox: { signature: "m" },
    resizebox: { signature: "s m m m" },
    // Define environments
    newenvironment: {
        signature: "s m o o m m",
        renderInfo: { breakAround: true },
    },
    renewenvironment: {
        signature: "s m o o m m",
        renderInfo: { breakAround: true },
    },
    newtheorem: {
        signature: "s m o m o",
        renderInfo: { breakAround: true },
    },
    newfont: {
        signature: "m m",
        renderInfo: { breakAround: true },
    },
    // Counters
    alph: { signature: "m" },
    Alph: { signature: "m" },
    arabic: { signature: "m" },
    roman: { signature: "m" },
    Roman: { signature: "m" },
    fnsymbol: { signature: "m" },
    // Other
    documentclass: {
        signature: "o m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    usepackage: {
        signature: "o m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    item: { signature: "o", renderInfo: { hangingIndent: true } },
    value: { signature: "m" },
    centering: { renderInfo: { breakAround: true } },
    input: { signature: "m", renderInfo: { breakAround: true } },
    include: { signature: "m", renderInfo: { breakAround: true } },
    includeonly: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    discretionary: { signature: "m m m" },
    hyphenation: { signature: "m m m" },
    footnote: { signature: "o m", renderInfo: { inParMode: true } },
    footnotemark: { signature: "o" },
    footnotetext: { signature: "o m", renderInfo: { inParMode: true } },
    // Math Commands
    sqrt: { signature: "o m" },
    frac: { signature: "m m" },
    stackrel: { signature: "m m" },
    ensuremath: { signature: "m" },
    // Layout commands
    maketitle: { renderInfo: { breakAround: true } },
    doublespacing: { renderInfo: { breakAround: true } },
    singlespacing: { renderInfo: { breakAround: true } },
    author: { signature: "m", renderInfo: { breakAround: true } },
    date: { signature: "m", renderInfo: { breakAround: true } },
    thanks: { signature: "m", renderInfo: { breakAround: true } },
    title: { signature: "m", renderInfo: { breakAround: true } },
    pagenumbering: { signature: "m", renderInfo: { breakAround: true } },
    pagestyle: { signature: "m", renderInfo: { breakAround: true } },
    thispagestyle: { signature: "m", renderInfo: { breakAround: true } },
    // Colors
    definecolor: { signature: "m m m", renderInfo: { breakAround: true } },
    textcolor: { signature: "o m m", renderInfo: { breakAround: true } },
    color: { signature: "o m", renderInfo: { breakAround: true } },
    pagecolor: { signature: "o m", renderInfo: { breakAround: true } },
    nopagecolor: { renderInfo: { breakAround: true } },
    multicolumn: { signature: "m m m" },
    // Graphics
    includegraphics: {
        signature: "s o o m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    rule: { signature: "o m m" },
    // Sectioning
    part: { signature: "s o m", renderInfo: { breakAround: true } },
    chapter: { signature: "s o m", renderInfo: { breakAround: true } },
    section: { signature: "s o m", renderInfo: { breakAround: true } },
    subsection: { signature: "s o m", renderInfo: { breakAround: true } },
    subsubsection: { signature: "s o m", renderInfo: { breakAround: true } },
    paragraph: { signature: "s o m", renderInfo: { breakAround: true } },
    subparagraph: { signature: "s o m", renderInfo: { breakAround: true } },
    appendix: { renderInfo: { breakAround: true } },
    frontmatter: { renderInfo: { breakAround: true } },
    mainmatter: { renderInfo: { breakAround: true } },
    backmatter: { renderInfo: { breakAround: true } },
    // Citing and references
    bibitem: { signature: "o m" },
    cite: { signature: "o m" },
    // Fonts
    textrm: { signature: "m", renderInfo: { inParMode: true } },
    textit: { signature: "m", renderInfo: { inParMode: true } },
    textmd: { signature: "m", renderInfo: { inParMode: true } },
    textbf: { signature: "m", renderInfo: { inParMode: true } },
    textup: { signature: "m", renderInfo: { inParMode: true } },
    textsl: { signature: "m", renderInfo: { inParMode: true } },
    textsf: { signature: "m", renderInfo: { inParMode: true } },
    textsc: { signature: "m", renderInfo: { inParMode: true } },
    texttt: { signature: "m", renderInfo: { inParMode: true } },
    emph: { signature: "m", renderInfo: { inParMode: true } },
    textnormal: { signature: "m", renderInfo: { inParMode: true } },
    uppercase: { signature: "m", renderInfo: { inParMode: true } },
    mathbf: { signature: "m" },
    mathsf: { signature: "m" },
    mathtt: { signature: "m" },
    mathit: { signature: "m" },
    mathnormal: { signature: "m" },
    mathcal: { signature: "m" },
    mathrm: { signature: "m" },
};

export const environments: SpecialEnvSpec = {
    document: { processContent: trim },
    array: { signature: "o m", renderInfo: { alignContent: true } },
    description: { signature: "o", processContent: cleanEnumerateBody as any },
    enumerate: { signature: "o", processContent: cleanEnumerateBody as any },
    itemize: { signature: "o", processContent: cleanEnumerateBody as any },
    trivlist: { signature: "o", processContent: cleanEnumerateBody as any },
    list: { signature: "m m", processContent: cleanEnumerateBody as any },
    figure: { signature: "o" },
    "figure*": { signature: "o" },
    filecontents: { signature: "o m" },
    "filecontents*": { signature: "o m" },
    minipage: { signature: "o o o m" },
    picture: { signature: "r() d()" },
    tabbing: { renderInfo: { alignContent: true } },
    table: { signature: "o" },
    tabular: { signature: "o m", renderInfo: { alignContent: true } },
    "tabular*": { signature: "m o m", renderInfo: { alignContent: true } },
    thebibliography: { signature: "m" },
    // Math
    math: { renderInfo: { inMathMode: true } },
};
