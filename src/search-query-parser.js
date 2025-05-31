/**
 * A single filter element like 'fieldname:term'.
 */
export class Filter {
    /**
     * @param {string|null} field The filter field (or null to match any field)
     * @param {string} term The term value for this filter
     * @param {string} operator The operator for this filter (':' for contains, '=' for exact match)
     */
    constructor(field, term, operator) {
        this.field = field;
        this.term = term;
        this.operator = operator;
    }

    /**
     * Parse a simple filter string like 'fieldname:term'.
     * @param {string} term The filter string to parse
     * @returns {Filter} A new Filter instance containing the parsed data
     */
    static parse(term) {
        let field = null;
        let operator = ":";// default: partial match

        const fieldMatch = term.match(/^(\w+)([:=])"?(.+?)"?$/);
        if (fieldMatch) {
            field = fieldMatch[1];
            operator = fieldMatch[2];
            term = fieldMatch[3];
        } else if (term.startsWith('"') && term.endsWith('"')) {
            term = term.slice(1, -1);
        }

        return new Filter(field, term, operator);
    }

    /**
     * Check whether this filter is equal to another filter.
     * @param {Filter} otherFilter The other filter to compare
     * @returns {bool} True if both filters are the same, false otherwise
     */
    equals(otherFilter) {
        return this.field === otherFilter.field
            && this.term === otherFilter.term
            && this.operator === otherFilter.operator;
    }

    /**
     * Turn this filter back to a string which can be parsed again.
     * @returns {string} The parseable string
     */
    toString() {
        let string = [];

        if (this.field !== null) {
            string.push(`${this.field}${this.operator}`);
        }

        let term = this.term;
        if (term.trim().includes(" ")) {
            term = `"${term}"`;
        }

        string.push(term);

        return string.join("");
    }

    /**
     * Check whether the given field value contains or equals this filter (depending on the operator of this filter).
     * @param {string} value The value to use for the match
     * @returns {bool} True if the field matches, false otherwise
     */
    matchField(value) {
        value = value.toLowerCase();
        let term = this.term.toLowerCase();

        return this.operator === "=" ? value === term : value.includes(term);
    }

    /**
     * Check whether the given entry matches this filter.
     * @param {object} entry The entry to check
     * @returns {bool} True if the entry matches, false otherwise
     */
    matchEntry(entry) {
        const values = this.getFields(entry);
        return values.some(value => this.matchField(value));
    }

    /**
     * Get a list of fields from the given entry.
     * @param {object} entry The entry to use
     * @returns {list} A list of field values
     */
    getFields(entry) {
        if (!this.field) {
            return Object.values(entry)
                .flatMap(value =>
                    typeof value === "string" ? [value] :
                    Array.isArray(value) ? value.filter(v => typeof v === "string") :
                    []
                )
                .filter(Boolean)
                .map(s => s.toLowerCase());
        }

        const value = entry[this.field.toLowerCase()];
        if (Array.isArray(value)) {
            return value.filter(s => typeof s === "string").map(s => s.toLowerCase());
        }

        if (typeof value === "string") {
            return [value.toLowerCase()];
        }

        return [];
    }
}

/**
 * A group of multiple filter items combined using OR or AND, like 'fieldname:term anotherfield:anotherterm'.
 * Each filter item might be a simple filter item or another filter group.
 */
export class FilterGroup {
    /**
     * @type {FilterGroup|Filter}
     */
    include;
    /**
     * @type {FilterGroup|Filter}
     */
    exclude;
    /**
     * @type {string}
     */
    mode;

    /**
     * @param {string} mode The mode to use (OR or AND)
     */
    constructor(mode = "AND") {
        this.include = [];
        this.exclude = [];
        this.mode = mode;// "OR" or "AND"
    }

    /**
     * Add a filter or filter group to this filter group.
     * @param {Filter|FilterGroup} filterOrGroup The Filter or FilterGroup instance to add
     * @param {bool} isExclude True to add it to the exclude list, false to add it to the include list
     */
    add(filterOrGroup, isExclude = false) {
        (isExclude ? this.exclude : this.include).push(filterOrGroup);
    }

    /**
     * Add a filter or filter group to this filter group and make sure this filter group has the correct mode ("OR" or "AND").
     * @param {Filter|FilterGroup} filterOrGroup The Filter or FilterGroup instance to add
     * @param {string} mode The mode to use ("OR" or "AND")
     * @param {bool} isExclude True to add it to the exclude list, false to add it to the include list
     */
    addWithMode(filterOrGroup, mode, isExclude = false) {
        if (!isExclude && this.mode !== mode) {
            // Move existing filters to sub group
            let subgroup = new FilterGroup(this.mode);
            subgroup.include = this.include;
            this.include = [subgroup];

            this.mode = mode;
        }

        this.add(filterOrGroup, isExclude);
    }

    /**
     * Remove the specified filter from this filter group.
     * @param {Filter} filter The filter to remove
     * @param {bool} isExclude True to remove it from the exclude list, false to remove it from the include list
     */
    remove(filter, isExclude = false) {
        let list = isExclude ? this.exclude : this.include;

        list = list.filter((item) => {
            if (!(item instanceof Filter)) {
                return;
            }

            return !item.equals(filter);
        });

        if (isExclude) {
            this.exclude = list;
        } else {
            this.include = list;
        }
    }

    /**
     * Check whether any of this filter group's filters matches the given entry.
     * @param {object} entry The entry to match against this group's filters
     * @returns {bool} True if the entry matches all filters, false otherwise
     */
    matchesEntry(entry) {
        const match = (item) =>
            item instanceof FilterGroup
                ? item.matchesEntry(entry)
                : item.matchEntry(entry);

        const includesMatch = this.include.length === 0
            ? true
            : this.mode === "AND"
                ? this.include.every(match)
                : this.include.some(match);

        const excludesMatch = this.exclude.every(item => !match(item));

        return includesMatch && excludesMatch;
    }

    /**
     * Check whether this filter group has at least one matching filter.
     * @param {Filter} filter The filter to check (comparing field, term and operator)
     * @param {bool} isExclude true if the filter should be searched in the exclude list, false if the filter should be search in the include list
     * @param {bool} nestedEntries true to recursively search all filter groups instead of just this one
     * @returns {bool} True if the given filter has been found, false otherwise
     */
    hasFilter(filter, isExclude = false, nestedEntries = false) {
        let list = isExclude ? this.exclude : this.include;

        return list.find((item) => {
            if (item instanceof Filter) {
                return item.equals(filter);
            } else if (item instanceof FilterGroup && nestedEntries) {
                return item.hasFilter(filter, isExclude, nestedEntries);
            } else {
                return false;
            }
        }) !== undefined;
    }

    /**
     * Turn this filter group back to a string which can be parsed again.
     * @returns {string} The parseable string
     */
    toString() {
        const itemMapper = (item, itemList) => {
            if (item instanceof FilterGroup && itemList.length > 1) {
                return `(${item.toString()})`;
            } else {
                return item.toString();
            }
        };

        const joiner = this.mode === "AND" ? " " : "~";

        const includes = this.include.map(item => itemMapper(item, this.include)).join(joiner);
        const excludes = this.exclude.map(item => `-${itemMapper(item, this.exclude)}`).join(" ");

        return [includes, excludes].filter(Boolean).join(" ");
    }
}

export class SearchQueryParser {
    constructor(query) {
        this.rootGroup = SearchQueryParser.parseQuery(query);
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
        let group = new FilterGroup("AND");
        let currentMode = "AND";

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
