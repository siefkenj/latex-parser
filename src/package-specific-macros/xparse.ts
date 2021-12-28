import { SpecialEnvSpec, SpecialMacroSpec } from "./types";

export const macros: SpecialMacroSpec = {
    NewDocumentCommand: {
        signature: "m m m",
        renderInfo: { breakAround: true },
    },
    RenewDocumentCommand: {
        signature: "m m m",
        renderInfo: { breakAround: true },
    },
    ProvideDocumentCommand: {
        signature: "m m m",
        renderInfo: { breakAround: true },
    },
    DeclareDocumentCommand: {
        signature: "m m m",
        renderInfo: { breakAround: true },
    },
    NewDocumentEnvironment: {
        signature: "m m m m",
        renderInfo: { breakAround: true },
    },
    RenewDocumentEnvironment: {
        signature: "m m m m",
        renderInfo: { breakAround: true },
    },
    ProvideDocumentEnvironment: {
        signature: "m m m m",
        renderInfo: { breakAround: true },
    },
    DeclareDocumentEnvironment: {
        signature: "m m m m",
        renderInfo: { breakAround: true },
    },
    NewExpandableDocumentCommand: {
        signature: "m m m",
        renderInfo: { breakAround: true },
    },
    RenewExpandableDocumentCommand: {
        signature: "m m m",
        renderInfo: { breakAround: true },
    },
    ProvideExpandableDocumentCommand: {
        signature: "m m m",
        renderInfo: { breakAround: true },
    },
    DeclareExpandableDocumentCommand: {
        signature: "m m m",
        renderInfo: { breakAround: true },
    },
};

export const environments: SpecialEnvSpec = {};
