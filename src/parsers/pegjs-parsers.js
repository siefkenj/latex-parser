// This file needs to be here because typescript does not know how to use babel's transpiler
// to directly load Pegjs grammars.
import LatexPegParser from "../grammars/latex.pegjs";
import AlignEnvironmentPegParser from "../grammars/align-environment.pegjs";
import ArgSpecPegParser from "../grammars/xparse-argspec.pegjs";

export { LatexPegParser, AlignEnvironmentPegParser, ArgSpecPegParser };
