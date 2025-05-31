import { describe, it, expect } from "vitest";
import { SearchQueryParser, Filter } from "../index";

describe("Build query", () => {
    it("Simple query", () => {
        let queryParser = new SearchQueryParser();

        queryParser.rootGroup.add(new Filter(null, "hello", ":"));

        expect(queryParser.toString()).toEqual("hello");
        expect(queryParser.matchesEntry({somefield: "hello from me"})).toBeTruthy();

        queryParser.rootGroup.add(new Filter("somefield", "hello world", "="));

        expect(queryParser.toString()).toEqual('hello somefield="hello world"');
        expect(queryParser.matchesEntry({somefield: "Hello World", anotherfield: "hello from me"})).toBeTruthy();
    });
});
