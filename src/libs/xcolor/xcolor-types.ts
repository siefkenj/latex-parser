export type Ast = Node[] | Node;
export type Node =
    | Color
    | InvalidSpec
    | ColorFunction
    | ColorExpr
    | ColorExtExpr
    | ColorMixExpr
    | WeightedColorExpr
    | Postfix;

export type XColor = Color;

interface AstNode {
    type: string;
}

interface InvalidSpec extends AstNode {
    type: "invalid_spec";
    content: string;
}

interface Color extends AstNode {
    type: "color";
    color: ColorExpr | ColorExtExpr;
    functions: ColorFunction[];
}

interface ColorFunction extends AstNode {
    type: "function";
    name: string;
    args: number[];
}

interface ColorExtExpr extends AstNode {
    type: "extended_expr";
    core_model: string;
    div: number | null;
    expressions: WeightedColorExpr[];
}

interface WeightedColorExpr extends AstNode {
    type: "weighted_expr";
    weight: number;
    color: ColorExpr;
}

interface ColorExpr extends AstNode {
    type: "expr";
    prefix: string | null;
    postfix: Postfix | null;
    name: string;
    mix_expr: ColorMixExpr[];
}

type ColorMixExpr =
    | { type: "complete_mix"; mix_percent: number; name: string }
    | { type: "partial_mix"; mix_percent: number };

interface Postfix extends AstNode {
    type: "postfix";
    plusses?: string;
    num?: number;
}
