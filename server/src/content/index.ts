import { createServer } from 'http';
import httpProxy from 'http-proxy';

const projectUrl = 'http://localhost:3000';

export const runContentServer = () => {
    // Create a proxy server instance
    const proxy = httpProxy.createProxyServer({
        target: projectUrl,
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
        res.end('Project not found at ' + projectUrl + req.url);
    });

    // Start the server
    server.listen(8082, () => {
        console.log(`Proxy server running on port 8082...`);
    });
};
