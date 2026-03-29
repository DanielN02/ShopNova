#!/bin/bash

# Local CI/CD Pipeline Test Script
# This script mimics what GitHub Actions runs in the CI/CD pipeline

set -e  # Exit on any error

echo "🚀 Running CI/CD Pipeline Locally..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 STAGE 1: Installing Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "→ Installing root dependencies..."
npm ci || { echo -e "${RED}❌ Root dependencies failed${NC}"; FAILED=1; }

echo "→ Installing frontend dependencies..."
cd frontend && npm ci && cd .. || { echo -e "${RED}❌ Frontend dependencies failed${NC}"; FAILED=1; }

echo "→ Installing user-order-service dependencies..."
cd services/user-order-service && npm ci && cd ../.. || { echo -e "${RED}❌ User-order-service dependencies failed${NC}"; FAILED=1; }

echo "→ Installing product-service dependencies..."
cd services/product-service && npm ci && cd ../.. || { echo -e "${RED}❌ Product-service dependencies failed${NC}"; FAILED=1; }

echo "→ Installing notification-service dependencies..."
cd services/notification-service && npm ci && cd ../.. || { echo -e "${RED}❌ Notification-service dependencies failed${NC}"; FAILED=1; }

if [ $FAILED -eq 1 ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ Dependency installation failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All dependencies installed${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 STAGE 2: TypeScript Type Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd frontend && npm run type-check && cd .. || { echo -e "${RED}❌ TypeScript type check failed${NC}"; FAILED=1; }

if [ $FAILED -eq 1 ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ Type checks failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ TypeScript type checks passed${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 STAGE 3: Running Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "→ Testing frontend..."
cd frontend && npm test && cd .. || { echo -e "${RED}❌ Frontend tests failed${NC}"; FAILED=1; }

echo "→ Testing user-order-service..."
cd services/user-order-service && npm test && cd ../.. || { echo -e "${RED}❌ User-order-service tests failed${NC}"; FAILED=1; }

echo "→ Testing product-service..."
cd services/product-service && npm test && cd ../.. || { echo -e "${RED}❌ Product-service tests failed${NC}"; FAILED=1; }

echo "→ Testing notification-service..."
cd services/notification-service && npm test && cd ../.. || { echo -e "${RED}❌ Notification-service tests failed${NC}"; FAILED=1; }

if [ $FAILED -eq 1 ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ Tests failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All tests passed${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  STAGE 4: Building Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd frontend && npm run build && cd .. || { echo -e "${RED}❌ Frontend build failed${NC}"; FAILED=1; }

if [ $FAILED -eq 1 ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Frontend build successful${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ ALL CI/CD CHECKS PASSED!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Your code is ready to push!"
