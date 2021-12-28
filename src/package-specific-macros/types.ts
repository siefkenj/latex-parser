import { EnvInfo, MacroInfo } from "../libs/ast";

export interface SpecialEnvSpec {
    [key: string]: EnvInfo;
}
export interface SpecialMacroSpec {
    [key: string]: MacroInfo;
}
