// tslint:disable:ban-types
// tslint:disable:prefer-const

declare function require(name: string);

import { IWebsocketServerProvider } from "../IWebsocketServerProvider";
import { WebSocketClient } from "../WebSocketClient";
// tslint:disable-next-line:no-var-requires
const WebSocket = require("ws");

/**
 * WS provider adapts the WS websocket server to a generic interface
 *
 * It will use the registerNewClient method to register the socket connection
 */
export class WSProvider implements IWebsocketServerProvider {

    public start(port: number, registerNewClient: Function) {
        let ws = WebSocket;
        const wss = new WebSocket.Server({ port });

        // console.log("Websocket started at port ", port);

        // Setup websocket
        wss.on("connection", (websocket) => {

            const websocketClient = new WebSocketClient();

            websocket.on("message", (message) => websocketClient.receive(message));

            websocket.on("close", (message) => websocketClient.close());

            // Attach the send action
            websocketClient.sendHandler = (message: string) => new Promise((resolve, reject) => {
                try {
                    websocket.send(
                        message,
                        { compress: true },
                        () => resolve());
                } catch (e) {
                    reject(e);
                }
            });
            registerNewClient(websocketClient);
        });
    }
}
