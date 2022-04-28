import * as Ast from "../ast-types";
import { getArgsInArray } from "./arguments";
import { updateRenderInfo } from "./render-info";
import { EnvInfo } from "./types";
import { match } from "./matchers";
import { walkAst } from "./walkers";
import { printRaw } from "../print-raw";
import { EnvInfoRecord } from "../ast-types";

/**
 * Recursively search for and process an environment. Arguments are
 * consumed according to the `signature` specified. The body is processed
 * with the specified `processContent` function (if specified). Any specified `renderInfo`
 * is attached to the environment node.
 *
 * @returns - a new AST
 */
export function processEnvironment(
    ast: Ast.Ast,
    envName: string,
    envInfo: EnvInfo
) {
    return walkAst(
        ast,
        (node: Ast.Environment) => {
            const ret = { ...node };
            // We don't process arguments if there is an existing `args` property.
            if (typeof envInfo.signature === "string" && ret.args == null) {
                const { arguments: args, rest } = getArgsInArray(
                    ret.content,
                    envInfo.signature
                );
                if (args.length > 0) {
                    ret.args = args;
                    ret.content = rest;
                }
            }

            updateRenderInfo(ret, envInfo.renderInfo);
            if (typeof envInfo.processContent === "function") {
                // process the body of the environment if a processing function was supplied
                ret.content = envInfo.processContent(ret.content);
            }

            return ret;
        },
        ((node: Ast.Ast) =>
            match.environment(node, envName)) as Ast.TypeGuard<Ast.Environment>
    );
}

/**
 * Recursively search for and process the specified environments. Arguments are
 * consumed according to the `signature` specified. The body is processed
 * with the specified `processContent` function (if given). Any specified `renderInfo`
 * is attached to the environment node.
 *
 * @returns - a new AST
 */
export function processEnvironments<T extends Ast.Ast>(
    ast: T,
    environments: EnvInfoRecord
): T {
    return walkAst(
        ast,
        (node) => {
            const envName = printRaw(node.env);
            const envInfo = environments[envName];

            const ret = { ...node };
            // We don't process arguments if there is an existing `args` property.
            if (typeof envInfo.signature === "string" && ret.args == null) {
                const { arguments: args, rest } = getArgsInArray(
                    ret.content,
                    envInfo.signature
                );
                if (args.length > 0) {
                    ret.args = args;
                    ret.content = rest;
                }
            }

            updateRenderInfo(ret, envInfo.renderInfo);
            if (typeof envInfo.processContent === "function") {
                // process the body of the environment if a processing function was supplied
                ret.content = envInfo.processContent(ret.content);
            }

            return ret;
        },
        match.createEnvironmentMatcher(environments)
    ) as T;
}
