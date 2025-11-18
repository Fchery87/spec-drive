#!/bin/bash

# E2E Testing Setup Script
# Run this to install all dependencies for Playwright E2E tests

set -e

echo "🎭 Setting up Playwright E2E Testing Environment"
echo ""

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
  echo "⚠️  This script needs sudo privileges to install system dependencies."
  echo "Please run: sudo bash scripts/setup-e2e.sh"
  exit 1
fi

echo "📦 Installing system dependencies..."
apt-get update
apt-get install -y libavif16

echo ""
echo "🌐 Installing Playwright browsers..."
# Switch back to regular user to install browsers
if [ -n "$SUDO_USER" ]; then
  sudo -u "$SUDO_USER" npx playwright install
else
  npx playwright install
fi

echo ""
echo "✅ E2E testing environment setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Start your dev server: pnpm dev:full"
echo "   2. Run E2E tests: npx playwright test"
echo "   3. View test report: npx playwright show-report"
echo ""
