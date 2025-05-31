import { describe, it, expect } from "vitest";
import { SearchQueryParser } from "../src/search-query-parser";

describe("Parse query", () => {
    it("Simple AND", () => {
        expect(new SearchQueryParser("is string").matchesEntry({text: "This is a string"})).toBeTruthy();
        expect(new SearchQueryParser("is string").matchesEntry({text: "This is some other string"})).toBeTruthy();
        expect(new SearchQueryParser("is string").matchesEntry({text: "This is something differently"})).toBeFalsy();
    });

    it("Simple OR", () => {
        expect(new SearchQueryParser("string~text").matchesEntry({text: "This is a string"})).toBeTruthy();
        expect(new SearchQueryParser("string~text").matchesEntry({text: "This is a text"})).toBeTruthy();
        expect(new SearchQueryParser("string~text").matchesEntry({text: "This is not a number"})).toBeFalsy();
    });

    it("Quotes", () => {
        expect(new SearchQueryParser('say "hello world"').matchesEntry({text: "I would say Hello World"})).toBeTruthy();
        expect(new SearchQueryParser('say "hello world"').matchesEntry({text: "I would say Hello from World"})).toBeFalsy();
    });

    it("AND combined with OR", () => {
        expect(new SearchQueryParser("hello world (i~you)").matchesEntry({text: "I would say Hello World"})).toBeTruthy();
        expect(new SearchQueryParser("hello world (i~you)").matchesEntry({text: "I would say hello to the world"})).toBeTruthy();
        expect(new SearchQueryParser("hello world (i~you)").matchesEntry({text: "You might say hello world"})).toBeTruthy();
        expect(new SearchQueryParser("hello world (i~you)").matchesEntry({text: "We don't say hello world"})).toBeFalsy();
        expect(new SearchQueryParser("hello world (i~you)").matchesEntry({text: "You said hello"})).toBeFalsy();
    });

    it("Nested brackets", () => {
        expect(new SearchQueryParser("say (hello (world~user))").matchesEntry({text: "I can say hello world"})).toBeTruthy();
        expect(new SearchQueryParser("say (hello (world~user))").matchesEntry({text: "I'm also able to say 'hello user'"})).toBeTruthy();
        expect(new SearchQueryParser("say (hello (world~user))").matchesEntry({text: "You could also say hello to any user"})).toBeTruthy();
        expect(new SearchQueryParser("say (hello (world~user))").matchesEntry({text: "But you can't say hello to anyone"})).toBeFalsy();
    });

    it("Exclude phrases", () => {
        expect(new SearchQueryParser("say -hello").matchesEntry({text: "I can say hi"})).toBeTruthy();
        expect(new SearchQueryParser("say -hello").matchesEntry({text: "I can't say hello"})).toBeFalsy();
        expect(new SearchQueryParser("say -hello -world").matchesEntry({text: "I can't say hello to any world"})).toBeFalsy();
        expect(new SearchQueryParser("say -hello -world").matchesEntry({text: "I also can't say hi to any world"})).toBeFalsy();
        expect(new SearchQueryParser("say -hello -world").matchesEntry({text: "But I can say hi to you"})).toBeTruthy();
        expect(new SearchQueryParser('say -"hello world"').matchesEntry({text: "I can say hello to you"})).toBeTruthy();
        expect(new SearchQueryParser('say -"hello world"').matchesEntry({text: "I can also say hello to some world"})).toBeTruthy();
        expect(new SearchQueryParser('say -"hello world"').matchesEntry({text: "But I can't say hello world"})).toBeFalsy();
        expect(new SearchQueryParser('say hello (-world~-user)').matchesEntry({text: "I can't say hello to the world"})).toBeFalsy();
        expect(new SearchQueryParser('say hello (-world~-user)').matchesEntry({text: "I can't say hello to a user"})).toBeFalsy();
        expect(new SearchQueryParser('say hello (-world~-user)').matchesEntry({text: "I can say hello to you"})).toBeTruthy();
    });
});
