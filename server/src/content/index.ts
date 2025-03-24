import { createServer } from 'http';
import httpProxy from 'http-proxy';

export const runContentServer = () => {
    // Create a proxy server instance
    const proxy = httpProxy.createProxyServer({
        target: 'http://localhost:3000',
        changeOrigin: true,
    });

    // Create HTTP server that uses the proxy
    const server = createServer((req, res) => {
        proxy.web(req, res);
    });

    // Error handling
    proxy.on('error', (err: any, req: any, res: any) => {
        console.error('Proxy error:', err);
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });
        res.end('Proxy error');
    });

    // Start the server
    server.listen(1235, () => {
        console.log(`Proxy server running on port 1235...`);
    });
};
