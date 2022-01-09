import { SpecialEnvSpec, SpecialMacroSpec } from "./types";

export const macros: SpecialMacroSpec = {
    systeme: {
        signature: "s o o m",
        renderInfo: { inMathMode: true },
    },
    sysdelim: {
        signature: "m m",
    },
    syseqsep: { signature: "m" },
    sysalign: { signature: "m" },
    syssignspace: { signature: "m" },
    syseqspace: { signature: "m" },
    syslineskipcoeff: { signature: "m" },
    syseqivsign: { signature: "m" },
    sysaddeqsign: { signature: "m" },
    sysremoveeqsign: { signature: "m" },
    sysextracolonsign: { signature: "m" },
    syscodeextracol: { signature: "m" },
    sysautonum: { signature: "m" },
    syssubstitute: { signature: "m" },
};

export const environments: SpecialEnvSpec = {};
