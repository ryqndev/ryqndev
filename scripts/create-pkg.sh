#!/bin/bash

# Exit on error
set -e

# Check if keyword argument is provided
if [ -z "$1" ]; then
    echo "Error: Package name is required"
    echo "Usage: pnpm create-pkg <keyword>"
    exit 1
fi

KEYWORD="$1"
PACKAGE_DIR="packages/$KEYWORD"
TEMPLATE_DIR="scripts/SAMPLE_PACKAGE"

# Check if SAMPLE_PACKAGE template exists
if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "Error: Template directory $TEMPLATE_DIR does not exist"
    exit 1
fi

# Check if package already exists
if [ -d "$PACKAGE_DIR" ]; then
    echo "Error: Package $KEYWORD already exists in packages/"
    exit 1
fi

echo "Creating package: $KEYWORD"

# Copy SAMPLE directory to new package
cp -r "$TEMPLATE_DIR" "$PACKAGE_DIR"

# Replace SAMPLE with keyword in all files
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    find "$PACKAGE_DIR" -type f -exec sed -i '' "s/SAMPLE/$KEYWORD/g" {} +
else
    # Linux
    find "$PACKAGE_DIR" -type f -exec sed -i "s/SAMPLE/$KEYWORD/g" {} +
fi

echo "Package $KEYWORD created successfully at $PACKAGE_DIR"

# Register the new package in the root tsconfig project references
node scripts/sync-tsconfig-refs.mjs

# Run pnpm install
echo "Running pnpm install..."
pnpm i

echo "Done! Package $KEYWORD is ready to use."
