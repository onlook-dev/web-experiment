import { IncomingMessage } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { yjsServer } from "./yjs";

export function runWebSocketServer() {
    // Main server code
    const PORT = Number(process.env['PORT'] || 8081);
    const wss = new WebSocketServer({ port: PORT });

    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        yjsServer.handleConnection(ws, req);
    });

    console.log(`Yjs Server running on port ${PORT}...`);
}