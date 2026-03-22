.PHONY: help install start dev test test-watch clean

help:
	@echo "Sendo Fleet Tracker — backend"
	@echo ""
	@echo "  make install     Install dependencies (npm install)"
	@echo "  make start       Run API (needs MONGODB_URI in .env)"
	@echo "  make dev         Run with nodemon (npm run dev)"
	@echo "  make test        Run Jest tests"
	@echo "  make test-watch  Run Jest in watch mode"
	@echo "  make clean       Remove node_modules and coverage/"

install:
	npm install

start:
	npm start

dev:
	npm run dev

test:
	npm test

test-watch:
	npm run test:watch

clean:
	rm -rf node_modules coverage
