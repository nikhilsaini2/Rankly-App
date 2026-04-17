export { colors, gradients, shadows } from "./color";
export { lightColors, lightGradients, lightShadows } from "./lightTheme";
export { radius } from "./radius";
export { spacing } from "./spacing";
export { typography } from "./typography";

// Shared theme type — both dark and light color objects conform to this shape.
// Stringify<T> widens all literal string values to `string` so lightColors
// (which has different literals) is assignable to AppTheme.
type Stringify<T> = { [K in keyof T]: string };
export type AppTheme = Stringify<typeof import("./color").colors>;
