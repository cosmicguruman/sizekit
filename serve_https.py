#!/usr/bin/env python3
"""
Simple HTTPS server for local testing of camera API
Requires cert.pem and key.pem in the same directory
"""

import http.server
import ssl
import os
import sys

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler with no-cache headers"""
    
    def end_headers(self):
        # Add no-cache headers to prevent browser caching
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    port = 8443
    
    # Check if certificate files exist
    if not os.path.exists('cert.pem') or not os.path.exists('key.pem'):
        print("❌ Certificate files not found!")
        print("\nGenerate them with:")
        print("openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes")
        sys.exit(1)
    
    # Create server with no-cache handler
    handler = NoCacheHTTPRequestHandler
    httpd = http.server.HTTPServer(('0.0.0.0', port), handler)
    
    # Wrap with SSL
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile='./cert.pem', keyfile='./key.pem')
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    print("✅ HTTPS Server Started (NO-CACHE MODE)!")
    print(f"\n📱 Access on this computer:")
    print(f"   https://localhost:{port}")
    print(f"\n📱 Access on mobile (same WiFi):")
    print(f"   Find your local IP with: ifconfig | grep 'inet ' | grep -v 127.0.0.1")
    print(f"   Then use: https://YOUR_LOCAL_IP:{port}")
    print(f"\n⚠️  You'll see a security warning (self-signed cert) - click 'Advanced' and proceed")
    print(f"\n🛑 Press Ctrl+C to stop\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n✅ Server stopped")
        httpd.shutdown()

if __name__ == "__main__":
    main()
