/**
 * WebSocketServer – HTTP server that hosts both ws and Socket.IO endpoints.
 *
 * A single HTTP server is created and shared. The ws WebSocketServer is
 * attached on a configurable path (default /ws), and the Socket.IO server
 * is attached on another path (default /play) with CORS enabled.
 */

import http from 'http';
import { WebSocketServer as WsServer } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { ConnectionManager, type NetworkConfig, DEFAULT_NETWORK_CONFIG } from './ConnectionManager.js';

/**
 * NetworkServer – Wraps the HTTP server and both WebSocket / Socket.IO layers.
 */
export class NetworkServer {
  private readonly httpServer: http.Server;
  private readonly wsServer: WsServer;
  private readonly ioServer: SocketIOServer;
  private readonly connectionManager: ConnectionManager;
  private readonly config: NetworkConfig;

  constructor(connectionManager: ConnectionManager, config: Partial<NetworkConfig> = {}) {
    this.connectionManager = connectionManager;
    this.config = { ...DEFAULT_NETWORK_CONFIG, ...config };

    // Create HTTP server (responds with 426 for plain HTTP requests)
    this.httpServer = http.createServer((_req, res) => {
      res.writeHead(426, { 'Content-Type': 'text/plain' });
      res.end('SMAUG 2.0 – Use WebSocket or Socket.IO to connect.');
    });

    // Attach ws WebSocketServer on the configured path
    this.wsServer = new WsServer({
      server: this.httpServer,
      path: this.config.wsPath,
    });

    this.wsServer.on('connection', (ws, req) => {
      const host = req.socket.remoteAddress ?? 'unknown';
      const port = req.socket.remotePort ?? 0;
      this.connectionManager.acceptWebSocket(ws, host, port);
    });

    // Attach Socket.IO server on the configured path
    this.ioServer = new SocketIOServer(this.httpServer, {
      path: this.config.socketioPath,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.ioServer.on('connection', (socket) => {
      const host = socket.handshake.address ?? 'unknown';
      const port = 0; // Socket.IO doesn't expose remote port directly
      this.connectionManager.acceptSocketIO(socket, host, port);
    });
  }

  /** Start listening on the configured port. */
  async start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.httpServer.once('error', reject);
      this.httpServer.listen(this.config.port, () => {
        this.httpServer.removeListener('error', reject);
        resolve();
      });
    });
  }

  /** Gracefully shut down all connections and the server. */
  stop(): void {
    this.ioServer.close();
    this.wsServer.close();
    this.httpServer.close();
  }

  /** Accessor for the connection manager. */
  getConnectionManager(): ConnectionManager {
    return this.connectionManager;
  }

  /** Accessor for the raw HTTP server (for testing). */
  getHttpServer(): http.Server {
    return this.httpServer;
  }
}
