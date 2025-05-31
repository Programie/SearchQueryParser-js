/**
 * A single filter element like 'fieldname:term'.
 */
export class Filter {
    field: string | null;
    term: string;
    operator: string;

    /**
     * @param field The filter field (or null to match any field)
     * @param term The term value for this filter
     * @param operator The operator for this filter (':' for contains, '=' for exact match)
     */
    constructor(field: string | null, term: string, operator: string) {
        this.field = field;
        this.term = term;
        this.operator = operator;
    }

    /**
     * Parse a simple filter string like 'fieldname:term'.
     * @param term The filter string to parse
     * @returns A new Filter instance containing the parsed data
     */
    static parse(term: string): Filter {
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
     * @param otherFilter The other filter to compare
     * @returns True if both filters are the same, false otherwise
     */
    equals(otherFilter: Filter): boolean {
        return this.field === otherFilter.field
            && this.term === otherFilter.term
            && this.operator === otherFilter.operator;
    }

    /**
     * Turn this filter back to a string which can be parsed again.
     * @returns The parseable string
     */
    toString(): string {
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
     * @param value The value to use for the match
     * @returns True if the field matches, false otherwise
     */
    matchField(value: string): boolean {
        value = value.toLowerCase();
        let term = this.term.toLowerCase();

        return this.operator === "=" ? value === term : value.includes(term);
    }

    /**
     * Check whether the given entry matches this filter.
     * @param entry The entry to check
     * @returns True if the entry matches, false otherwise
     */
    matchEntry(entry: Record<string, string>): boolean {
        const values = this.getFields(entry);
        return values.some((value: string) => this.matchField(value));
    }

    /**
     * Get a list of fields from the given entry.
     * @param entry The entry to use
     * @returns A list of field values
     */
    getFields(entry: Record<string, string>): Array<string> {
        if (!this.field) {
            return Object.values(entry)
                .flatMap((value: string | Array<string>) =>
                    typeof value === "string" ? [value] :
                        Array.isArray(value) ? value.filter(v => typeof v === "string") :
                            []
                )
                .filter(Boolean)
                .map((string: string) => string.toLowerCase());
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
