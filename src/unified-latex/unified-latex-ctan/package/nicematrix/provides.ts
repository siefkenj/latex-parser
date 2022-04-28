import { MacroInfoRecord, EnvInfoRecord } from "../../../unified-latex-types";

export const macros: MacroInfoRecord = {
    NiceMatrixOptions: {
        signature: "m",
        renderInfo: { pgfkeysArgs: true, breakAround: true },
    },
};

export const environments: EnvInfoRecord = {
    NiceTabular: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceMatrixBlock: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceArrayWithDelims: {
        signature: "m m o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    pNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    bNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    BNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    vNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    VNiceArray: {
        signature: "o m !o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    NiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    pNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    bNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    BNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    vNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
    VNiceMatrix: {
        signature: "!o",
        renderInfo: { pgfkeysArgs: true, alignContent: true },
    },
};
