import { WebSocketClient } from "./WebSocketClient";

export interface IWebsocketServerProvider {
    start(port: number, registerNewClient: NewSocketCallback);
}

export type NewSocketCallback= (socketClient: WebSocketClient) => void;
