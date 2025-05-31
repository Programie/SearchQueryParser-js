import Filter from "./Filter";
import FilterGroup from "./FilterGroup";

export class SearchQueryParser {
    constructor(query = null) {
        if (query === null) {
            this.rootGroup = new FilterGroup();
        } else {
            this.rootGroup = SearchQueryParser.parseQuery(query);
        }
    }

    /**
     * Check whether this search query parser has at least one filter.
     * @returns {bool} True if there is at least one filter, false otherwise
     */
    hasQuery() {
        return this.rootGroup.include.length || this.rootGroup.exclude.length;
    }

    /**
     * Check whether the parsed query matches the given entry.
     * @param {object} entry The netry to check
     * @returns {bool} True if the query matches the given entry, false otherwise
     */
    matchesEntry(entry) {
        return this.rootGroup.matchesEntry(entry);
    }

    /**
     * Turn this search query back to a string which can be parsed again.
     * @returns {string} The parseable string
     */
    toString() {
        return this.rootGroup.toString();
    }

    /**
     * Parse the given query.
     * @private
     * @param {string} query The query string to parse
     * @returns {FilterGroup} A new FilterGroup with the parsed filters
     */
    static parseQuery(query) {
        const tokens = SearchQueryParser.tokenize(query);
        const [group] = SearchQueryParser.parseTokens(tokens);
        return group;
    }

    /**
     * Tokenize the given query string.
     * @private
     * @param {string} query The query string to parse
     * @returns {list[string]} A list of parsed token
     */
    static tokenize(query) {
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
     * @param {list[string]} tokens The tokens to parse
     * @param {number} start The offset where to start
     * @returns {FilterGroup,number} An array containing the FilterGroup and length of the tokens
     */
    static parseTokens(tokens, start = 0) {
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
