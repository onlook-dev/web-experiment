import { IncomingMessage } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { yjsServer } from './YjsServer';

// Main server code
const PORT = Number(process.env['PORT'] || 1234);
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('Connection established', req.url);
    yjsServer.handleConnection(ws, req);
});

console.log(`Yjs Server running on port ${PORT}`);

// Handle shutdown
process.on('SIGINT', () => {
    yjsServer.close();
    process.exit(0);
});