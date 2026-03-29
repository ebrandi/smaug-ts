/**
 * Network layer barrel export.
 */

export { NetworkServer } from './WebSocketServer.js';
export {
  ConnectionManager,
  ConnectionState,
  Descriptor,
  WebSocketTransport,
  SocketIOTransport,
  type ITransport,
  type ProtocolCapabilities,
  type OlcEditorData,
  type NetworkConfig,
  DEFAULT_NETWORK_CONFIG,
} from './ConnectionManager.js';
export { SocketIOAdapter } from './SocketIOAdapter.js';
export { TelnetProtocol } from './TelnetProtocol.js';
