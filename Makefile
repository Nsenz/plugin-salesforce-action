BUILD_DIR := dist

.PHONY: all build clean install lint lint-fix help

all: build

help:
	@echo "Salesforce Plugin Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  make build         - Build the plugin"
	@echo "  make install       - Install dependencies"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make lint          - Run linter"
	@echo "  make lint-fix      - Run linter and fix issues"
	@echo ""
	@echo "Required environment variables:"
	@echo "  VITE_CLIENT_ID               - Salesforce OAuth Client ID"
	@echo "  VITE_REDIRECT_URI            - OAuth callback URL"

install:
	@echo "Installing dependencies..."
	@npm install
	@echo "Dependencies installed"

build:
	@echo "Building plugin..."
	@if [ -z "$(VITE_CLIENT_ID)" ]; then \
		echo "Error: VITE_CLIENT_ID environment variable is not set"; \
		exit 1; \
	fi
	@if [ -z "$(VITE_REDIRECT_URI)" ]; then \
		echo "Error: VITE_REDIRECT_URI environment variable is not set"; \
		exit 1; \
	fi
	@npm run build
	@echo "Build completed"
	@echo "Output directory: $(BUILD_DIR)"

lint:
	@echo "Running linter..."
	@npm run lint

lint-fix:
	@echo "Running linter with auto-fix..."
	@npm run lint:fix

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@echo "Clean completed"
