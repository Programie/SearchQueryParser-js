import Filter from "./Filter";

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
