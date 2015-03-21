# TESTS

TESTER = ./node_modules/.bin/mocha
OPTS = --require ./test/init.js
TESTS = test/*.test.js
JSHINT = ./node_modules/.bin/jshint

test:
	$(TESTER) $(OPTS) $(TESTS)
test-verbose:
	$(TESTER) $(OPTS) --reporter spec $(TESTS)
testing:
	$(TESTER) $(OPTS) --watch $(TESTS)

JS_FILES = $(shell find . -type f -name "*.js" \
					 -not -path "./node_modules/*" -and \
					 -not -path "./coverage/*" -and \
					 -not -path "./test/*" -and \
					 -not -path "./docs/*" -and \
					 -not -path "./vendor/*" -and \
					 -not -path "./templates/*" -and \
					 -not -path "./db/schema.js")

check:
	@$(JSHINT) $(JS_FILES)

# MAN DOCS

CLI_MAN = $(shell find docs/cli -name '*.md' \
               |sed 's|.md|.1|g' \
               |sed 's|docs/cli/|man/|g' )

API_MAN = $(shell find docs/api -name '*.md' \
               |sed 's|.md|.3|g' \
               |sed 's|docs/api/|man/|g' )

CLI_WEB = $(shell find docs/cli -name '*.md' \
               |sed 's|.md|.1.html|g' \
               |sed 's|docs/cli/|man/html/|g' )

API_WEB = $(shell find docs/api -name '*.md' \
               |sed 's|.md|.3.html|g' \
               |sed 's|docs/api/|man/html/|g' ) \
               man/html/railway-changelog.3.html \
               man/html/changelog.3.html \

man/%.1: docs/cli/%.md scripts/doc.sh
	@[ -d man ] || mkdir man
	scripts/doc.sh $< $@

man/%.3: docs/api/%.md scripts/doc.sh
	@[ -d man ] || mkdir man
	scripts/doc.sh $< $@

man/html/%.3.html: docs/api/%.md scripts/doc.sh docs/footer.html
	@[ -d man/html ] || mkdir -p man/html
	scripts/doc.sh $< $@

man/html/%.1.html: docs/cli/%.md scripts/doc.sh
	@[ -d man/html ] || mkdir -p man/html
	scripts/doc.sh $< $@

man/html/railway-changelog.3.html: RAILWAY-CHANGELOG.md scripts/doc.sh
	scripts/doc.sh $< $@

man/html/changelog.3.html: CHANGELOG.md scripts/doc.sh
	scripts/doc.sh $< $@

MAN = $(API_MAN) $(CLI_MAN)

build: man

html: $(API_WEB) $(CLI_WEB)

web: $(API_WEB)
	rsync ./man/html/* compoundjs.com:/var/www/apps/compoundjs.com/public/man
	scp ./docs/index.html compoundjs.com:/var/www/apps/compoundjs.com/compound/docs

all: $(MAN) $(API_WEB)

man: $(MAN)

# WEBSITE DOCS

docs:
	node docs/sources/build
apidocs:
	makedoc lib/*.js lib/*/*.js -t "RailwayJS API docs" -g "1602/express-on-railway" --assets

.PHONY: test doc docs
