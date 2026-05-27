#!/bin/bash
# Maintenance & Diagnostic Scripts
# Use these to verify the project health

echo "=== GESTION BLS - System Diagnostic ==="
echo "Date: $(date)"
echo ""

# 1. Node & npm versions
echo "📦 Dependencies:"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo ""

# 2. Check .env.local
echo "🔒 Environment:"
if [ -f .env.local ]; then
  if grep -q "DATABASE_URL" .env.local; then
    echo "✅ .env.local exists with DATABASE_URL"
  else
    echo "⚠️  .env.local exists but DATABASE_URL is missing"
  fi
else
  echo "❌ .env.local not found - create it from .env.example"
fi
echo ""

# 3. Check git
echo "📝 Git Status:"
if grep -q ".env.local" .gitignore; then
  echo "✅ .env.local is in .gitignore"
else
  echo "⚠️  .env.local might be tracked in git"
fi
echo ""

# 4. Build status
echo "🏗️  Build Status:"
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed - run 'npm run build' for details"
fi
echo ""

# 5. TypeScript check
echo "📋 TypeScript:"
npx tsc --noEmit > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ No TypeScript errors"
else
  echo "❌ TypeScript errors found - run 'npx tsc --noEmit'"
fi
echo ""

# 6. Dependencies audit
echo "🔍 Security Audit:"
npm audit > /dev/null 2>&1
audit_code=$?
if [ $audit_code -eq 0 ]; then
  echo "✅ No known vulnerabilities"
elif [ $audit_code -eq 1 ]; then
  echo "⚠️  Some vulnerabilities found - run 'npm audit'"
else
  echo "ℹ️  npm audit: $audit_code"
fi
echo ""

# 7. Database connection
echo "🗄️  Database:"
if [ -n "$DATABASE_URL" ]; then
  echo "✅ DATABASE_URL is set"
else
  echo "❌ DATABASE_URL not set in environment"
fi
echo ""

# 8. Summary
echo "=== Summary ==="
echo "To start development: npm run dev"
echo "To deploy: See DEPLOYMENT_GUIDE.md"
echo "To verify setup: See CHECKLIST.md"
echo ""
