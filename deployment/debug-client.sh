#!/bin/bash

echo "🔍 Debugging client container issues..."

# Build the client image
echo "🐳 Building client image..."
cd client
docker build -t debug-client .

# Test with verbose output
echo "🔍 Testing container startup..."
docker run --rm -it --name debug-client -p 5000:5000 -e PORT=5000 debug-client /bin/sh -c "
echo 'Container started'
echo 'Environment:'
env | grep PORT
echo 'Nginx config before:'
cat /etc/nginx/conf.d/default.conf
echo 'Running startup script...'
/start.sh
"
