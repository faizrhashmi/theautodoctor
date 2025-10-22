#!/bin/bash

#########################################################################
# Security & Code Quality Audit Script
#
# This script runs comprehensive checks on the codebase to ensure:
# - Type safety (TypeScript)
# - Code quality (ESLint)
# - Dependency security (npm audit)
# - Unused dependencies (depcheck)
#
# Usage:
#   ./scripts/audit.sh          # Run all checks
#   ./scripts/audit.sh --quick  # Skip slow checks (build)
#########################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
QUICK_MODE=false
if [[ "$1" == "--quick" ]]; then
  QUICK_MODE=true
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🔒 Security & Code Quality Audit${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

#########################################################################
# 1. TypeScript Type Checking
#########################################################################
echo -e "${YELLOW}[1/5]${NC} Running TypeScript type check..."
if npm run typecheck; then
  echo -e "${GREEN}✓${NC} TypeScript check passed"
else
  echo -e "${RED}✗${NC} TypeScript check failed"
  exit 1
fi
echo ""

#########################################################################
# 2. ESLint (Strict Mode)
#########################################################################
echo -e "${YELLOW}[2/5]${NC} Running ESLint (strict mode, no warnings allowed)..."
if npm run lint:strict; then
  echo -e "${GREEN}✓${NC} ESLint passed"
else
  echo -e "${RED}✗${NC} ESLint failed"
  exit 1
fi
echo ""

#########################################################################
# 3. Dependency Security Audit
#########################################################################
echo -e "${YELLOW}[3/5]${NC} Running npm security audit (high severity only)..."
if npm run audit:security; then
  echo -e "${GREEN}✓${NC} No high-severity vulnerabilities found"
else
  echo -e "${RED}✗${NC} High-severity vulnerabilities detected!"
  echo -e "${YELLOW}→${NC} Run 'npm audit fix' to attempt automatic fixes"
  exit 1
fi
echo ""

#########################################################################
# 4. Unused Dependencies Check
#########################################################################
echo -e "${YELLOW}[4/5]${NC} Checking for unused dependencies..."
if npm run audit:deps; then
  echo -e "${GREEN}✓${NC} No unused dependencies found"
else
  echo -e "${YELLOW}⚠${NC} Unused dependencies detected (see above)"
  echo -e "${YELLOW}→${NC} This is a warning, not a failure"
fi
echo ""

#########################################################################
# 5. Build Check (Skip in Quick Mode)
#########################################################################
if [[ "$QUICK_MODE" == true ]]; then
  echo -e "${YELLOW}[5/5]${NC} Skipping build check (quick mode)"
else
  echo -e "${YELLOW}[5/5]${NC} Running production build..."
  if npm run build; then
    echo -e "${GREEN}✓${NC} Build successful"
  else
    echo -e "${RED}✗${NC} Build failed"
    exit 1
  fi
fi
echo ""

#########################################################################
# Summary
#########################################################################
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All audits passed successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "  1. Review AUDIT_REPORT.md for detailed findings"
echo -e "  2. Address any remaining TODO items"
echo -e "  3. Run integration tests for auth guards"
echo ""

exit 0
