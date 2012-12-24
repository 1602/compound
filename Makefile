docs:
	node docs/sources/build
apidocs:
	makedoc lib/*.js -t "RailwayJS API docs" -g "1602/express-on-railway" --assets

.PHONY: test
.PHONY: doc
.PHONY: docs
