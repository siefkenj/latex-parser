import { SpecialEnvSpec, SpecialMacroSpec } from "./types";

export const macros: SpecialMacroSpec = {
    DeclareMathOperator: {
        signature: "s m m",
        renderInfo: { breakAround: true },
    },
    mathtoolsset: {
        signature: "m",
        renderInfo: { breakAround: true, pgfkeysArgs: true },
    },
    mathllap: {
        signature: "o m",
    },
    mathrlap: {
        signature: "o m",
    },
    mathclap: {
        signature: "o m",
    },
    clap: {
        signature: "m",
    },
    mathmbox: {
        signature: "m",
    },
    mathmakebox: {
        signature: "o o m",
    },
    cramped: {
        signature: "o m",
    },
    crampedllap: {
        signature: "o m",
    },
    crampedrlap: {
        signature: "o m",
    },
    crampedclap: {
        signature: "o m",
    },
    crampedsubstack: {
        signature: "o m",
    },
    smashoperator: {
        signature: "o m",
    },
    newtagform: {
        signature: "m o m m",
    },
    renewtagform: {
        signature: "m o m m",
    },
    usetagform: {
        signature: "m",
    },
    xleftrightarrow: { signature: "o m" },
    xLeftarrow: { signature: "o m" },
    xhookleftarrow: { signature: "o m" },
    xmapsto: { signature: "o m" },
    xRightarrow: { signature: "o m" },
    xLeftrightarrow: { signature: "o m" },
    xhookrightarrow: { signature: "o m" },
    underbracket: { signature: "o o m" },
    overbracket: { signature: "o o m" },
    underbrace: { signature: "m" },
    overbrace: { signature: "m" },
    shoveleft: { signature: "o m" },
    shoveright: { signature: "o m" },
    ArrowBetweenLines: { signature: "s o" },
    vdotswithin: { signature: "m" },
    shortdotswithin: { signature: "s m" },
    DeclarePairedDelimiter: {
        signature: "m m m",
        renderInfo: { breakAround: true },
    },
    DeclarePairedDelimiterX: {
        signature: "m o m m m",
        renderInfo: { breakAround: true },
    },
    DeclarePairedDelimiterXPP: {
        signature: "m o m m m m m",
        renderInfo: { breakAround: true },
    },
    prescript: { signature: "m m m" },
    DeclareMathSizes: { signature: "m m m m" },
    newgathered: { signature: "m m m m" },
    renewgathered: { signature: "m m m m" },
    splitfrac: { signature: "m m" },
    splitdfrac: { signature: "m m" },
    xmathstrut: { signature: "o m" },
    // amsthm
    newtheorem: { signature: "s m o m o", renderInfo: { breakAround: true } },
    theoremstyle: { signature: "m", renderInfo: { breakAround: true } },
    newtheoremstyle: {
        signature: "m m m m m m m m m",
        renderInfo: { breakAround: true },
    },
    // amsmath
    text: { signature: "m", renderInfo: { inMathMode: false } },
    // amsfonts
    mathbb: { signature: "m" },
    mathscr: { signature: "m" },
    mathfrak: { signature: "m" },
    frak: { signature: "m" },
    Bdd: { signature: "m" },
    bold: { signature: "m" },
};

export const environments: SpecialEnvSpec = {
    crampedsubarray: {
        signature: "m",
        renderInfo: { alignContent: true, inMathMode: true },
    },
    matrix: { renderInfo: { alignContent: true } },
    bmatrix: { renderInfo: { alignContent: true } },
    pmatrix: { renderInfo: { alignContent: true } },
    vmatrix: { renderInfo: { alignContent: true } },
    Bmatrix: { renderInfo: { alignContent: true } },
    Vmatrix: { renderInfo: { alignContent: true } },
    smallmatrix: { renderInfo: { alignContent: true } },
    psmallmatrix: { renderInfo: { alignContent: true } },
    vsmallmatrix: { renderInfo: { alignContent: true } },
    bsmallmatrix: { renderInfo: { alignContent: true } },
    Bsmallmatrix: { renderInfo: { alignContent: true } },
    Vsmallmatrix: { renderInfo: { alignContent: true } },
    "matrix*": { signature: "o", renderInfo: { alignContent: true } },
    "bmatrix*": { signature: "o", renderInfo: { alignContent: true } },
    "pmatrix*": { signature: "o", renderInfo: { alignContent: true } },
    "vmatrix*": { signature: "o", renderInfo: { alignContent: true } },
    "Bmatrix*": { signature: "o", renderInfo: { alignContent: true } },
    "Vmatrix*": { signature: "o", renderInfo: { alignContent: true } },
    "smallmatrix*": { signature: "o", renderInfo: { alignContent: true } },
    "psmallmatrix*": { signature: "o", renderInfo: { alignContent: true } },
    "bsmallmatrix*": { signature: "o", renderInfo: { alignContent: true } },
    "vsmallmatrix*": { signature: "o", renderInfo: { alignContent: true } },
    "Bsmallmatrix*": { signature: "o", renderInfo: { alignContent: true } },
    "Vsmallmatrix*": { signature: "o", renderInfo: { alignContent: true } },
    multilined: { signature: "o o" },
    cases: { renderInfo: { alignContent: true } },
    "cases*": { renderInfo: { alignContent: true } },
    dcases: { renderInfo: { alignContent: true } },
    "dcases*": { renderInfo: { alignContent: true } },
    rcases: { renderInfo: { alignContent: true } },
    "rcases*": { renderInfo: { alignContent: true } },
    drcases: { renderInfo: { alignContent: true } },
    "drcases*": { renderInfo: { alignContent: true } },
    spreadlines: { signature: "m" },
    lgathered: { signature: "o" },
    rgathered: { signature: "o" },
    // amsmath
    "align*": { renderInfo: { inMathMode: true, alignContent: true } },
    align: { renderInfo: { inMathMode: true, alignContent: true } },
    "alignat*": { renderInfo: { inMathMode: true, alignContent: true } },
    alignat: { renderInfo: { inMathMode: true, alignContent: true } },
    "equation*": { renderInfo: { inMathMode: true } },
    equation: { renderInfo: { inMathMode: true } },
    "gather*": { renderInfo: { inMathMode: true } },
    gather: { renderInfo: { inMathMode: true } },
    "multline*": { renderInfo: { inMathMode: true } },
    multline: { renderInfo: { inMathMode: true } },
    "flalign*": { renderInfo: { inMathMode: true, alignContent: true } },
    flalign: { renderInfo: { inMathMode: true, alignContent: true } },
    split: { renderInfo: { inMathMode: true } },
};
