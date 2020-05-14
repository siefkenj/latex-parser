const ESCAPE = "\\";

/**
 * Renders the AST to a string without any pretty printing.
 *
 * @param {*} node
 */
export function printRaw(node) {
    if (typeof node === "string") {
        return node;
    }
    if (Array.isArray(node)) {
        return node.map(printRaw).join("");
    }
    // tmp variables
    let argsString = "";
    switch (node.type) {
        case "argument":
            return node.openMark + printRaw(node.content) + node.closeMark;
        case "comment":
            var suffix = node.suffixParbreak ? "" : "\n";
            if (node.sameline) {
                return "%" + printRaw(node.content) + suffix;
            }
            return "\n%" + printRaw(node.content) + suffix;
        case "environment":
        case "mathenv":
        case "verbatim":
            var env = printRaw(node.env);
            var envStart = ESCAPE + "begin{" + env + "}";
            var envEnd = ESCAPE + "end{" + env + "}";
            argsString = node.args == null ? "" : printRaw(node.args);
            return envStart + argsString + printRaw(node.content) + envEnd;
        case "displaymath":
            return ESCAPE + "[" + printRaw(node.content) + ESCAPE + "]";
        case "group":
            return "{" + printRaw(node.content) + "}";
        case "inlinemath":
            return "$" + printRaw(node.content) + "$";
        case "macro":
            argsString = node.args == null ? "" : printRaw(node.args);
            return ESCAPE + printRaw(node.content) + argsString;
        case "parbreak":
            return "\n\n";
        case "string":
            return node.content;
        case "subscript":
            if (node.content.type === "group") {
                // Groups are already wrapped in {...}. We don't want
                // to double do it!
                return "_" + printRaw(node.content);
            }
            return "_{" + printRaw(node.content) + "}";
        case "superscript":
            if (node.content.type === "group") {
                // Groups are already wrapped in {...}. We don't want
                // to double do it!
                return "^" + printRaw(node.content);
            }
            return "^{" + printRaw(node.content) + "}";
        case "verb":
            return (
                ESCAPE +
                node.env +
                node.escape +
                printRaw(node.content) +
                node.escape
            );
        case "whitespace":
            return " ";

        default:
            console.warn(
                "Cannot find render for node ",
                node,
                `(of type ${typeof node})`
            );
            return "" + node;
    }
}
