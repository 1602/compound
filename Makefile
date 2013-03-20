# TESTS

TESTER = ./node_modules/.bin/mocha
OPTS = --require ./test/init.js
TESTS = test/*.test.js

test:
	$(TESTER) $(OPTS) $(TESTS)
test-verbose:
	$(TESTER) $(OPTS) --reporter spec $(TESTS)
testing:
	$(TESTER) $(OPTS) --watch $(TESTS)

# MAN DOCS

CLI_MAN = $(shell find docs/cli -name '*.md' \
               |sed 's|.md|.1|g' \
               |sed 's|docs/cli/|man/man1/|g' )

API_MAN = $(shell find docs/api -name '*.md' \
               |sed 's|.md|.3|g' \
               |sed 's|docs/api/|man/man3/|g' )

API_WEB = $(shell find docs/api -name '*.md' \
               |sed 's|.md|.html|g' \
               |sed 's|docs/api/|man/html/|g' )

man/man1/%.1: docs/cli/%.md scripts/doc.sh
	@[ -d man/man1 ] || mkdir -p man/man1
	scripts/doc.sh $< $@

man/man3/%.3: docs/api/%.md scripts/doc.sh
	@[ -d man/man3 ] || mkdir -p man/man3
	scripts/doc.sh $< $@

man/html/%.html: docs/api/%.md scripts/doc.sh
	@[ -d man/man3 ] || mkdir -p man/man3
	scripts/doc.sh $< $@

MAN = $(API_MAN) $(CLI_MAN)

build: all

all: $(MAN) $(API_WEB)

man: $(MAN)

# WEBSITE DOCS

docs:
	node docs/sources/build
apidocs:
	makedoc lib/*.js lib/*/*.js -t "RailwayJS API docs" -g "1602/express-on-railway" --assets

.PHONY: test doc docs
