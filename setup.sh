#!/bin/bash

# AIOps RCA Setup Script
# This script sets up the AIOps RCA project on a fresh machine

echo "🚀 Setting up AIOps RCA (Root Cause Analysis) Tool..."
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to v18 or higher."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# AIOps RCA Environment Variables
VITE_APP_TITLE=AIOps RCA
VITE_APP_VERSION=1.0.0
EOF
    echo "✅ .env file created"
fi

echo ""
echo "🎉 Setup complete! You can now run the application:"
echo ""
echo "   npm run dev"
echo ""
echo "   Then open http://localhost:5173 in your browser"
echo ""
echo "📚 For more information, see README.md"
echo "🔗 GitHub: https://github.com/hpandya-atlassian/serv-co-ops-skunk-works"
echo ""
echo "Happy coding! 🚀"
