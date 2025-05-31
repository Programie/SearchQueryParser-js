# Search Query Parser

A simple parser for search query strings.

## Usage

The main class of this library is `SearchQueryParser`. Initialize it with the query string to parse (see details bellow) and use it to check whether the supplied query matches something.

The method `matchesEntry` of the `SearchQueryParser` instance can be used to check whether the query matches a given entry. An entry is a plain JavaScript object where each property is the field to match and each property value the value to match.

## Query syntax

The search query syntax is very basic but should be enough in most cases.

Every phrase is separated by spaces which means "AND". Connecting phrases using "OR" instead of "AND" is also possible by separating the phrases using `~`.

Example of "AND" connected phrases:
```
something anotherthing
```

Example of "OR" connected phrases:
```
something~anotherthing
```

Add quotes around a string if it contains spaces:
```
something "another thing"
```

To combine "AND" as well as "OR" in a query, use round brackets:
```
something anotherthing (me~you)
```

Brackets can also be nested:
```
(something (anotherthing~anything)) (me~you)
```

To exclude specific phrases, add `-` in front of the phrase:
```
from:me -to:someone

to:someone -hello

from:someone -excludethis -"exclude that"
```

## Examples

### Basic queries

```javascript
let parser = new SearchQueryParser('somefield:"some value" hello world');

// This will match as "somefield" contains "some value", any field ("anotherfield" in this case) contains "hello" and any field ("someotherfield" in this case) contains "world"
parser.matchesEntry({
    somefield: "This is some value",
    anotherfield: "Hello",
    someotherfield: "World"
});

// This won't match as the phrase "world" is missing
parser.matchesEntry({
    somefield: "This is some value",
    anotherfield: "Hello"
});

// This will match again as "world" is contained again
parser.matchesEntry({
    somefield: "This is some value",
    anotherfield: "Hello World"
});

// This will also match even if the order of the searched phrases is different from the actual field content
parser.matchesEntry({
    somefield: "This is some value",
    anotherfield: "World said: Hello"
});
```

### Advanced queries

```javascript
let parser = new SearchQueryParser('(from=me~from=you) (greeting=hello~greeting=hi) "some text"');

// This will match as field "from" exactly matches "me", field "greeting" exactly matches "hello" and field "text" contains "some text"
parser.matchesEntry({
    from: "me",
    greeting: "Hello",
    text: "This is some text to search."
});

// This will also match as field "from" exactly matches "you", field "greeting" exactly matches "hello" and field "text" contains "some text"
parser.matchesEntry({
    from: "me",
    greeting: "Hello",
    text: "This is some text to search."
});
```
