import { match } from "../../libs/ast/matchers";

export { match };

export const {
    anyEnvironment,
    anyMacro,
    anyString,
    argument,
    blankArgument,
    comment,
    environment,
    group,
    macro,
    math,
    parbreak,
    string,
    whitespace,
} = match;
