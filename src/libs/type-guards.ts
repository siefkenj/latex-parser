/**
 * Returns whether `obj[prop]` exists. This function acts as a type guard.
 *
 * Code modified from
 * https://fettblog.eu/typescript-hasownproperty/
 */
export function hasProp<X extends {}, Y extends PropertyKey>(
    obj: X,
    prop: Y
): obj is X & Record<Y, X[keyof X]> {
    return prop in obj;
}
