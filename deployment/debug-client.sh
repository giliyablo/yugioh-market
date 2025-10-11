#!/bin/bash

echo "🔍 Debugging client container issues..."

# Build the client image
echo "🐳 Building client image..."
cd client
docker build -t debug-client .

# Test with verbose output
echo "🔍 Testing container startup..."
docker run --rm -it --name debug-client -p 80:80 -e PORT=80 debug-client /bin/sh -c "
echo 'Container started'
echo 'Environment:'
env | grep PORT
echo 'Nginx config before:'
cat /etc/nginx/conf.d/default.conf
echo 'Running startup script...'
/start.sh
"
