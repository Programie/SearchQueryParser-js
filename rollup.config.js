import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";

export default {
    input: "src/index.ts",
    output: {
        file: "dist/searchqueryparser.min.js",
        format: "es",
        name: "SearchQueryParser",
        sourcemap: true
    },
    plugins: [
        typescript(),
        terser()
    ]
};
