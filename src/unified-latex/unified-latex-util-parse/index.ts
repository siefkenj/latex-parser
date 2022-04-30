import { unified } from "unified";
import { unifiedLatexStringComplier } from "./libs/complier-string";
import { unifiedLatexAstComplier } from "./libs/complier-ast";
import { unifiedLatexFromString } from "./libs/plugin-from-string";

export * from "./libs/complier-ast";
export * from "./libs/complier-string";
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
