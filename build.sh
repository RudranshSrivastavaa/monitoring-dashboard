#!/bin/bash

# Build script for Real-time Monitoring Tool Frontend
# This script builds the React application for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
APP_NAME="monitoring-dashboard"
BUILD_DIR="build"
DIST_DIR="dist"

# Get current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check Node.js installation
check_node() {
    print_status "Checking Node.js installation..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or later."
        print_status "Download from: https://nodejs.org/"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    local node_version=$(node --version)
    local npm_version=$(npm --version)
    print_success "Node.js version: $node_version"
    print_success "npm version: $npm_version"
}

# Check if package.json exists
check_package_json() {
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Make sure you're in the frontend directory."
        exit 1
    fi
}

# Install dependencies
install_deps() {
    print_status "Installing dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependencies installed successfully"
}

# Clean previous builds
clean_builds() {
    print_status "Cleaning previous builds..."
    rm -rf "$BUILD_DIR"
    rm -rf "$DIST_DIR"
}

# Build for development
build_dev() {
    print_status "Building for development..."
    
    # Set development environment variables
    export REACT_APP_API_URL=${REACT_APP_API_URL:-"http://localhost:8080/api"}
    export REACT_APP_WS_URL=${REACT_APP_WS_URL:-"ws://localhost:8080/ws"}
    export GENERATE_SOURCEMAP=true
    
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Development build completed"
        
        # Show build size
        if [ -d "$BUILD_DIR" ]; then
            local size=$(du -sh "$BUILD_DIR" | cut -f1)
            print_status "Build size: $size"
        fi
    else
        print_error "Development build failed"
        exit 1
    fi
}

# Build for production
build_production() {
    print_status "Building for production..."
    
    # Set production environment variables
    export NODE_ENV=production
    export GENERATE_SOURCEMAP=false
    export REACT_APP_API_URL=${REACT_APP_API_URL:-"/api"}
    export REACT_APP_WS_URL=${REACT_APP_WS_URL:-"ws://localhost:8080/ws"}
    
    # Build the application
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Production build completed"
        
        # Create dist directory and copy build files
        mkdir -p "$DIST_DIR"
        cp -r "$BUILD_DIR"/* "$DIST_DIR/"
        
        # Show build size
        local size=$(du -sh "$DIST_DIR" | cut -f1)
        print_status "Production build size: $size"
        
        # List main files
        print_status "Main files:"
        ls -la "$DIST_DIR" | head -10
    else
        print_error "Production build failed"
        exit 1
    fi
}

# Optimize build
optimize_build() {
    print_status "Optimizing build..."
    
    if [ ! -d "$DIST_DIR" ]; then
        print_error "No production build found. Run 'production' first."
        exit 1
    fi
    
    # Compress files (if gzip is available)
    if command -v gzip &> /dev/null; then
        print_status "Compressing files..."
        find "$DIST_DIR" -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -k {} \;
        print_success "Files compressed"
    fi
    
    # Remove source maps for production
    find "$DIST_DIR" -name "*.map" -delete
    print_success "Source maps removed"
}

# Test build
test_build() {
    print_status "Testing build..."
    
    if [ ! -d "$DIST_DIR" ]; then
        print_error "No build found. Run 'production' first."
        exit 1
    fi
    
    # Check if index.html exists
    if [ ! -f "$DIST_DIR/index.html" ]; then
        print_error "index.html not found in build"
        exit 1
    fi
    
    # Check if main JS files exist
    local js_files=$(find "$DIST_DIR" -name "*.js" | wc -l)
    local css_files=$(find "$DIST_DIR" -name "*.css" | wc -l)
    
    print_status "JavaScript files: $js_files"
    print_status "CSS files: $css_files"
    
    # Check for environment variables in build
    if grep -q "REACT_APP_API_URL" "$DIST_DIR/static/js"/*.js 2>/dev/null; then
        print_warning "Environment variables found in build (this is normal)"
    fi
    
    print_success "Build test completed"
}

# Start development server
start_dev() {
    print_status "Starting development server..."
    
    # Set development environment variables
    export REACT_APP_API_URL=${REACT_APP_API_URL:-"http://localhost:8080/api"}
    export REACT_APP_WS_URL=${REACT_APP_WS_URL:-"ws://localhost:8080/ws"}
    
    npm start
}

# Start production server (using serve)
start_prod() {
    print_status "Starting production server..."
    
    if [ ! -d "$DIST_DIR" ]; then
        print_error "No production build found. Run 'production' first."
        exit 1
    fi
    
    # Check if serve is installed
    if ! command -v serve &> /dev/null; then
        print_status "Installing serve globally..."
        npm install -g serve
    fi
    
    print_status "Starting server on port 3000..."
    serve -s "$DIST_DIR" -l 3000
}

# Show help
show_help() {
    echo "Usage: $0 [command]"
    echo
    echo "Commands:"
    echo "  build        Build for development (default)"
    echo "  production   Build optimized production build"
    echo "  optimize     Optimize production build"
    echo "  test         Test the build"
    echo "  clean        Clean build directories"
    echo "  deps         Install dependencies only"
    echo "  dev          Start development server"
    echo "  serve        Start production server"
    echo "  help         Show this help message"
    echo
    echo "Environment Variables:"
    echo "  REACT_APP_API_URL    Backend API URL"
    echo "  REACT_APP_WS_URL     WebSocket URL"
    echo "  NODE_ENV             Node environment (production/development)"
    echo
    echo "Examples:"
    echo "  $0                    # Build for development"
    echo "  $0 production         # Build for production"
    echo "  REACT_APP_API_URL=https://api.example.com $0 production"
    echo "  $0 serve              # Start production server"
}

# Main execution
main() {
    local command=${1:-build}
    
    case "$command" in
        "build")
            check_node
            check_package_json
            clean_builds
            install_deps
            build_dev
            ;;
        "production")
            check_node
            check_package_json
            clean_builds
            install_deps
            build_production
            optimize_build
            test_build
            ;;
        "optimize")
            optimize_build
            ;;
        "test")
            test_build
            ;;
        "clean")
            clean_builds
            ;;
        "deps")
            check_node
            check_package_json
            install_deps
            ;;
        "dev")
            check_node
            check_package_json
            install_deps
            start_dev
            ;;
        "serve")
            check_node
            start_prod
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
