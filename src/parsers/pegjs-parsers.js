// This file needs to be here because typescript does not know how to use babel's transpiler
// to directly load Pegjs grammars.
import LatexPegParser from "../grammars/latex.pegjs";
import AlignEnvironmentPegParser from "../grammars/align-environment.pegjs";
import ArgSpecPegParser from "../grammars/xparse-argspec.pegjs";
import PgfkeysParser from "../grammars/pgfkeys.pegjs";
import MacroSubstitutionParser from "../grammars/macro-substitutions.pegjs";
import LigaturesParser from "../grammars/ligatures.pegjs";
import XColorParser from "../grammars/xcolor-expressions.pegjs";
import TabularParser from "../grammars/tabular-spec.pegjs";

export {
    LatexPegParser,
    AlignEnvironmentPegParser,
    ArgSpecPegParser,
    PgfkeysParser,
    MacroSubstitutionParser,
    LigaturesParser,
    XColorParser,
    TabularParser,
};
