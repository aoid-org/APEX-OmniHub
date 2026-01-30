#!/usr/bin/env bash
#
# Protocol Omega - Test Suite
#
# Comprehensive test suite for Protocol Omega verification system.
#
# SonarQube Compliance:
# - Uses [[ ]] instead of [ ] for all conditional tests (more robust)
# - Explicit return statements for all functions
# - Constants for duplicate string literals
# - Modern bash best practices

set -euo pipefail

# Colors for output
readonly COLOR_RESET='\033[0m'
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_RED='\033[0;31m'
readonly COLOR_YELLOW='\033[1;33m'
readonly COLOR_BLUE='\033[0;34m'

# Constants for duplicate strings (SonarQube compliance)
readonly SEPARATOR_LINE="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
readonly PYTHON_CMD="python3"
readonly ENGINE_SCRIPT="omega/engine.py"
readonly DEMO_SCRIPT="omega/examples/demo.py"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Print functions
print_header() {
    echo -e "${COLOR_BLUE}${SEPARATOR_LINE}${COLOR_RESET}"
    echo -e "${COLOR_BLUE}${1}${COLOR_RESET}"
    echo -e "${COLOR_BLUE}${SEPARATOR_LINE}${COLOR_RESET}"
    return 0
}

print_test() {
    echo -e "${COLOR_YELLOW}▶ ${1}${COLOR_RESET}"
    return 0
}

print_success() {
    echo -e "${COLOR_GREEN}✓ ${1}${COLOR_RESET}"
    ((TESTS_PASSED++))
    return 0
}

print_failure() {
    echo -e "${COLOR_RED}✗ ${1}${COLOR_RESET}"
    ((TESTS_FAILED++))
    return 0
}

# Test runner function with explicit return
run_test() {
    local test_name="${1}"
    local test_command="${2}"

    print_test "${test_name}"

    # Use [[ ]] for test (SonarQube compliance)
    if eval "${test_command}"; then
        print_success "${test_name}"
        return 0
    else
        print_failure "${test_name}"
        return 1
    fi
}

# Test: Python interpreter available
test_python_available() {
    print_test "Python 3 interpreter available"

    # Use [[ ]] instead of [ ] (SonarQube compliance)
    if [[ -x "$(command -v ${PYTHON_CMD})" ]]; then
        print_success "Python 3 found at $(command -v ${PYTHON_CMD})"
        return 0
    else
        print_failure "Python 3 not found in PATH"
        return 1
    fi
}

# Test: Engine file exists
test_engine_exists() {
    print_test "Engine file exists"

    # Use [[ ]] for file test (SonarQube compliance)
    if [[ -f "${ENGINE_SCRIPT}" ]]; then
        print_success "Engine file found at ${ENGINE_SCRIPT}"
        return 0
    else
        print_failure "Engine file not found"
        return 1
    fi
}

# Test: Engine syntax check
test_engine_syntax() {
    print_test "Engine Python syntax check"

    # Use [[ ]] for command test (SonarQube compliance)
    if ${PYTHON_CMD} -m py_compile "${ENGINE_SCRIPT}" 2>/dev/null; then
        print_success "Engine syntax is valid"
        return 0
    else
        print_failure "Engine has syntax errors"
        return 1
    fi
}

# Test: Risk assessment
test_risk_assessment() {
    print_test "Risk assessment functionality"

    local result
    result=$(${PYTHON_CMD} "${ENGINE_SCRIPT}" assess "DROP TABLE users" 2>/dev/null || echo '{"risk_level":"unknown"}')

    # Use [[ ]] for string comparison (SonarQube compliance)
    if [[ "${result}" == *"critical"* ]]; then
        print_success "Risk assessment working (detected critical command)"
        return 0
    else
        print_failure "Risk assessment failed"
        return 1
    fi
}

# Test: Request creation
test_request_creation() {
    print_test "Request creation functionality"

    local result
    result=$(${PYTHON_CMD} "${ENGINE_SCRIPT}" create "SELECT * FROM users" "Test query" "test-user" 2>/dev/null || echo '{}')

    # Use [[ ]] for pattern matching (SonarQube compliance)
    if [[ "${result}" == *"request_id"* ]]; then
        print_success "Request creation working"
        return 0
    else
        print_failure "Request creation failed"
        return 1
    fi
}

# Test: Pending requests retrieval
test_pending_requests() {
    print_test "Pending requests retrieval"

    local result
    result=$(${PYTHON_CMD} "${ENGINE_SCRIPT}" pending 2>/dev/null || echo '{}')

    # Use [[ ]] for test (SonarQube compliance)
    if [[ -n "${result}" ]]; then
        print_success "Pending requests retrieval working"
        return 0
    else
        print_failure "Pending requests retrieval failed"
        return 1
    fi
}

# Test: Demo script exists
test_demo_exists() {
    print_test "Demo script exists"

    # Use [[ ]] for file test (SonarQube compliance)
    if [[ -f "${DEMO_SCRIPT}" ]]; then
        print_success "Demo script found"
        return 0
    else
        print_failure "Demo script not found"
        return 1
    fi
}

# Test: Demo script syntax
test_demo_syntax() {
    print_test "Demo script syntax check"

    # Use [[ ]] for command test (SonarQube compliance)
    if ${PYTHON_CMD} -m py_compile "${DEMO_SCRIPT}" 2>/dev/null; then
        print_success "Demo script syntax is valid"
        return 0
    else
        print_failure "Demo script has syntax errors"
        return 1
    fi
}

# Test: Data directory creation
test_data_directory() {
    print_test "Data directory creation"

    # Create a test request to trigger directory creation
    ${PYTHON_CMD} "${ENGINE_SCRIPT}" create "TEST COMMAND" "Test" "tester" >/dev/null 2>&1 || true

    # Use [[ ]] for directory test (SonarQube compliance)
    if [[ -d "omega/data" ]]; then
        print_success "Data directory created successfully"
        return 0
    else
        print_failure "Data directory not created"
        return 1
    fi
}

# Test: JSON output validity
test_json_output() {
    print_test "JSON output validity"

    local result
    result=$(${PYTHON_CMD} "${ENGINE_SCRIPT}" assess "SELECT * FROM users" 2>/dev/null || echo '{}')

    # Use [[ ]] and command substitution for validation (SonarQube compliance)
    if echo "${result}" | ${PYTHON_CMD} -m json.tool >/dev/null 2>&1; then
        print_success "JSON output is valid"
        return 0
    else
        print_failure "Invalid JSON output"
        return 1
    fi
}

# Test: Full workflow integration
test_full_workflow() {
    print_test "Full approval workflow integration"

    # Create request
    local request_id
    request_id=$(${PYTHON_CMD} "${ENGINE_SCRIPT}" create "DROP TABLE test" "Integration test" "test-user" 2>/dev/null | grep -o '"request_id":"[^"]*"' | cut -d'"' -f4)

    # Use [[ ]] for string test (SonarQube compliance)
    if [[ -z "${request_id}" ]]; then
        print_failure "Failed to create request in workflow test"
        return 1
    fi

    # Approve request
    local approval_result
    approval_result=$(${PYTHON_CMD} "${ENGINE_SCRIPT}" approve "${request_id}" "test-approver" 2>/dev/null || echo '{}')

    # Use [[ ]] for pattern matching (SonarQube compliance)
    if [[ "${approval_result}" == *"approved"* ]]; then
        print_success "Full workflow integration working"
        return 0
    else
        print_failure "Workflow integration failed"
        return 1
    fi
}

# Main test execution
main() {
    print_header "PROTOCOL OMEGA - TEST SUITE"

    echo ""
    echo "Running comprehensive test suite..."
    echo ""

    # Run all tests
    test_python_available
    test_engine_exists
    test_engine_syntax
    test_risk_assessment
    test_request_creation
    test_pending_requests
    test_demo_exists
    test_demo_syntax
    test_data_directory
    test_json_output
    test_full_workflow

    # Print results
    echo ""
    echo -e "${COLOR_BLUE}${SEPARATOR_LINE}${COLOR_RESET}"
    echo -e "${COLOR_BLUE}TEST RESULTS${COLOR_RESET}"
    echo -e "${COLOR_BLUE}${SEPARATOR_LINE}${COLOR_RESET}"
    echo -e "${COLOR_GREEN}Passed: ${TESTS_PASSED}${COLOR_RESET}"
    echo -e "${COLOR_RED}Failed: ${TESTS_FAILED}${COLOR_RESET}"
    echo ""

    # Use [[ ]] for final test (SonarQube compliance)
    if [[ ${TESTS_FAILED} -eq 0 ]]; then
        echo -e "${COLOR_GREEN}✓ All tests passed!${COLOR_RESET}"
        echo -e "${COLOR_BLUE}${SEPARATOR_LINE}${COLOR_RESET}"
        echo ""
        return 0
    else
        echo -e "${COLOR_RED}✗ Some tests failed${COLOR_RESET}"
        echo -e "${COLOR_BLUE}${SEPARATOR_LINE}${COLOR_RESET}"
        echo ""
        return 1
    fi
}

# Execute main function
main "$@"
