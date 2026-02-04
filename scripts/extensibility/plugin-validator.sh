#!/bin/bash
# APEX-FIX: Compliance with ShellCheck Standards (SC2155, SC2086)
# Function to validate plugin structure
validate_plugin() { # APEX-FIX: Separate declaration and assignment to preserve exit codes (SC2155) local plugin_path local validation_level local verbose

local plugin_path
local validation_level
local verbose

plugin_path="$1"
validation_level="${2:-basic}"
verbose="${3:-false}"
# APEX-FIX: Use [[ ]] for safer conditional testing
if [[ -z "$plugin_path" ]]; then
    echo "Error: Plugin path is required."
    return 1
fi
if [[ ! -d "$plugin_path" ]]; then
    echo "Error: Plugin directory not found at $plugin_path"
    return 1
fi
echo "Validating plugin at: $plugin_path (Level: $validation_level)"
# Core validation logic
if [[ -f "$plugin_path/package.json" ]]; then
    if [[ "$verbose" == "true" ]]; then
        echo "✔ package.json found"
    fi
else
    echo "✘ Missing package.json"
    return 1
  fi
# APEX-FIX: Explicit return 0 for success
return 0
}

# Main execution entry point
main() { 
  local target 
  target="$1"

if [[ -z "$target" ]]; then
    echo "Usage: $0 <plugin-path>"
    exit 1
fi
if validate_plugin "$target"; then
    echo "Plugin validation passed."
    exit 0
else
    echo "Plugin validation failed."
    exit 1
fi
}

# Execute main with provided arguments
main "$@"
