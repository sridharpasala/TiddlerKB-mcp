#!/bin/bash
# Setup script for TiddlyWiki Node.js server

echo "🚀 Setting up TiddlyWiki Node.js server..."

# Install TiddlyWiki globally
echo "📦 Installing TiddlyWiki..."
npm install -g tiddlywiki

# Create a new wiki that uses our tid files
echo "📁 Creating TiddlyWiki instance..."
cd /Users/sridharpasala/Documents/CodeRepo/GitHub/Blendcepts/MyTiddlyKB

# Initialize a new wiki
tiddlywiki wiki --init server

# Copy our tid files to the wiki's tiddlers folder
echo "📄 Copying .tid files..."
cp tests/*.tid wiki/tiddlers/

# Create a simple start script
cat > start-wiki.sh << 'EOF'
#!/bin/bash
echo "🌐 Starting TiddlyWiki on http://localhost:8080"
echo "Press Ctrl+C to stop"
tiddlywiki wiki --listen port=8080
EOF

chmod +x start-wiki.sh

echo "✅ Setup complete!"
echo ""
echo "To start TiddlyWiki:"
echo "  ./start-wiki.sh"
echo ""
echo "Then open http://localhost:8080 in your browser"