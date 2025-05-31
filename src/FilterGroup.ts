import { Filter } from "./Filter.js";

/**
 * A group of multiple filter items combined using OR or AND, like 'fieldname:term anotherfield:anotherterm'.
 * Each filter item might be a simple filter item or another filter group.
 */
export class FilterGroup {
    include: Array<FilterGroup | Filter>;
    exclude: Array<FilterGroup | Filter>;
    mode: string;

    /**
     * @param mode The mode to use (OR or AND)
     */
    constructor(mode: string = "AND") {
        this.include = [];
        this.exclude = [];
        this.mode = mode;// "OR" or "AND"
    }

    /**
     * Add a filter or filter group to this filter group.
     * @param filterOrGroup The Filter or FilterGroup instance to add
     * @param isExclude True to add it to the exclude list, false to add it to the include list
     */
    add(filterOrGroup: Filter | FilterGroup, isExclude: boolean = false) {
        (isExclude ? this.exclude : this.include).push(filterOrGroup);
    }

    /**
     * Add a filter or filter group to this filter group and make sure this filter group has the correct mode ("OR" or "AND").
     * @param filterOrGroup The Filter or FilterGroup instance to add
     * @param mode The mode to use ("OR" or "AND")
     * @param isExclude True to add it to the exclude list, false to add it to the include list
     */
    addWithMode(filterOrGroup: Filter | FilterGroup, mode: string, isExclude: boolean = false) {
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
     * @param filter The filter to remove
     * @param isExclude True to remove it from the exclude list, false to remove it from the include list
     */
    remove(filter: Filter, isExclude: boolean = false) {
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
     * @param entry The entry to match against this group's filters
     * @returns True if the entry matches all filters, false otherwise
     */
    matchesEntry(entry: Record<string, string>): boolean {
        const match = (item: Filter | FilterGroup) =>
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
     * @param filter The filter to check (comparing field, term and operator)
     * @param isExclude true if the filter should be searched in the exclude list, false if the filter should be search in the include list
     * @param nestedEntries true to recursively search all filter groups instead of just this one
     * @returns True if the given filter has been found, false otherwise
     */
    hasFilter(filter: Filter, isExclude: boolean = false, nestedEntries: boolean = false): boolean {
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
     * @returns The parseable string
     */
    toString(): string {
        const itemMapper = (item: Filter | FilterGroup, itemList: Array<FilterGroup | Filter>) => {
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
