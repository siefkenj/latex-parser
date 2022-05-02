import { unified } from "unified";
import { unifiedLatexStringComplier } from "./libs/compiler-string";
import { unifiedLatexAstComplier } from "./libs/compiler-ast";
import { unifiedLatexFromString } from "./libs/plugin-from-string";

export * from "./libs/compiler-ast";
export * from "./libs/compiler-string";
export * from "./libs/plugin-from-string";
export * from "./libs/plugin-from-string-minimal";
export * from "./libs/parse-minimal";
export * from "./libs/parse";
export * from "./libs/parse-math";

export const processLatexViaUnified = () => {
    return unified()
        .use(unifiedLatexFromString)
        .use(unifiedLatexStringComplier, { pretty: true });
};

export const processLatexToAstViaUnified = () => {
    return unified().use(unifiedLatexFromString).use(unifiedLatexAstComplier);
};
