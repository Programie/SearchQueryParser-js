import { Filter } from "./Filter.js";
import { FilterGroup } from "./FilterGroup.js";

export class SearchQueryParser {
    rootGroup: FilterGroup;

    constructor(query: string | null = null) {
        if (query === null) {
            this.rootGroup = new FilterGroup();
        } else {
            this.rootGroup = SearchQueryParser.parseQuery(query);
        }
    }

    /**
     * Check whether this search query parser has at least one filter.
     * @returns True if there is at least one filter, false otherwise
     */
    hasQuery(): boolean {
        return this.rootGroup.include.length > 0 || this.rootGroup.exclude.length > 0;
    }

    /**
     * Check whether the parsed query matches the given entry.
     * @param entry The netry to check
     * @returns True if the query matches the given entry, false otherwise
     */
    matchesEntry(entry: Record<string, string>): boolean {
        return this.rootGroup.matchesEntry(entry);
    }

    /**
     * Turn this search query back to a string which can be parsed again.
     * @returns {string} The parseable string
     */
    toString(): string {
        return this.rootGroup.toString();
    }

    /**
     * Parse the given query.
     * @private
     * @param query The query string to parse
     * @returns A new FilterGroup with the parsed filters
     */
    static parseQuery(query: string): FilterGroup {
        const tokens = SearchQueryParser.tokenize(query);
        const [group] = SearchQueryParser.parseTokens(tokens);
        return group;
    }

    /**
     * Tokenize the given query string.
     * @private
     * @param query The query string to parse
     * @returns A list of parsed token
     */
    static tokenize(query: string): Array<string> {
        const tokens = [];
        let buffer = "";
        let inQuotes = false;

        [...query].forEach((character) => {
            if (character === '"') {
                buffer += character;
                inQuotes = !inQuotes;
            } else if (!inQuotes && (character === "(" || character === ")" || character === "~" || character === " ")) {
                if (buffer.trim()) {
                    tokens.push(buffer.trim());
                }

                if (character !== " ") {
                    tokens.push(character);
                }

                buffer = "";
            } else {
                buffer += character;
            }
        });

        if (buffer.trim()) {
            tokens.push(buffer.trim());
        }

        return tokens;
    }

    /**
     * Parse the given tokens (returned by tokenize()) into a new FilterGroup instance.
     * @private
     * @param tokens The tokens to parse
     * @param start The offset where to start
     * @returns An array containing the FilterGroup and length of the tokens
     */
    static parseTokens(tokens: Array<string>, start: number = 0): [FilterGroup, number] {
        let group = new FilterGroup();
        let currentMode = group.mode;

        for (let i = start; i < tokens.length; i++) {
            const token = tokens[i];

            if (token === "~") {
                currentMode = "OR";
            } else if (token === "(") {
                const [subgroup, nextIndex] = SearchQueryParser.parseTokens(tokens, i + 1);
                group.add(subgroup);
                i = nextIndex;
            } else if (token === ")") {
                group.mode = currentMode;
                return [group, i];
            } else {
                const isExclude = token.startsWith("-");
                const raw = isExclude ? token.slice(1) : token;
                const filter = Filter.parse(raw);
                group.add(filter, isExclude);
            }
        }

        group.mode = currentMode;
        return [group, tokens.length];
    }
}
