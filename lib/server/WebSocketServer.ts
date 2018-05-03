import { IWebsocketServerProvider } from "./websockets/IWebsocketServerProvider";
import { QueueHandler } from "./websockets/QueueHandler";
import { Subscribers } from "./websockets/Subscribers";
import { WebSocketClient } from "./websockets/WebSocketClient";
import { WebSocketMessage } from "./websockets/WebSocketMessage";

// The Websocket Server takes care of receiving and registering socket clients
export class WebSocketServer {
    private webSocketServer: IWebsocketServerProvider;
    private subscribers: Subscribers = new Subscribers();
    private messageQueue: QueueHandler = new QueueHandler();

    constructor(provider: IWebsocketServerProvider, port: number) {
        this.webSocketServer = provider;

        this.webSocketServer.start(
            port,
            (client: WebSocketClient) => this.registerNewClient(client));
    }

    public registerNewClient(websocketClient: WebSocketClient) {

        websocketClient.setQueueHandler(this.messageQueue);

        // Set action on close
        websocketClient.onClose = (wsocketClient: WebSocketClient) => {
            this.subscribers.remove(wsocketClient);
        };

        // When we have a message, handle it with the given websocket client
        websocketClient.messageHandler = (message: WebSocketMessage) => {
            const subscribers = this.subscribers;

            if (message.action === WebSocketMessage.ACTION_REGISTER) {
                subscribers.add(message.subjects, websocketClient);
            } else {
                subscribers.publish(websocketClient, message);
            }
        };
    }
}
