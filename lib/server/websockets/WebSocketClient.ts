// tslint:disable:prefer-const
import { Guid } from "../../shared/Guid";
import { QueueHandler } from "./QueueHandler";
import { WebSocketMessage } from "./WebSocketMessage";

export class WebSocketClient {

    public static get CLOSED() { return "CLOSED"; }
    public static get OPEN() { return "OPEN"; }

    public static get SEND_SENDING() { return "SENDING"; }
    public static get SEND_IDLE() { return "IDLE"; }

    public id: string = Guid.create();

    public fromId: string;



    public socketStatus: string = WebSocketClient.OPEN;

    public sendStatus: string = WebSocketClient.SEND_IDLE;

    // POC: shortcut solution
    public messageHandler: (message: WebSocketMessage) => void;
    public onClose: (socketClient: WebSocketClient) => void;
    public sendHandler: (messageString: string) => void;

    private messageQueue: QueueHandler;
    private queueHandler: QueueHandler;

    public setQueueHandler(queueHandler: QueueHandler) {
        this.messageQueue = queueHandler;
    }

    public send(webSocketMessage: WebSocketMessage) {

        this.messageQueue.addMessage(this.fromId, webSocketMessage);

        // Send if no process is running.
        if (this.sendStatus === WebSocketClient.SEND_IDLE) {
            this.runQueue();
        }
    }


    public receive(rawMessage: any) {
        const message = new WebSocketMessage(rawMessage, WebSocketMessage.INCOMING);

        if (message.action === WebSocketMessage.ACTION_REGISTER) {
            this.fromId = message.fromId;

        }

        // Message handler is registered in the server
        this.messageHandler(message);
    }
    public close() {

        if (this.socketStatus === WebSocketClient.CLOSED) {
            return;
        }

        this.socketStatus = WebSocketClient.CLOSED;

        // Remove bindings
        this.sendHandler = null;
        this.messageHandler = null;

        this.onClose(this);
    }

    private async runQueue() {

        // If we are not idle, we are still working on the queue, no further action is needed
        if (this.sendStatus !== WebSocketClient.SEND_IDLE) {
            return;
        }


        // Get queue
        const messageQueue = this.messageQueue;

        // Run until we have nothig left to run
        while (messageQueue.length(this.fromId) > 0) {

            // Get first in stack
            const webSocketMessage = messageQueue.getMessage(this.fromId);

            try {
                // Set tot sending
                this.sendStatus = WebSocketClient.SEND_SENDING;

                // Send handler is defined in the websocket provider, where this object is instantiated
                await this.sendHandler(webSocketMessage.toString());

                // Set to idle
                this.sendStatus = WebSocketClient.SEND_IDLE;

            } catch (e) {
                // If we get an error sending the message, this is probably due to a broken connection
                this.sendStatus = WebSocketClient.SEND_IDLE;

                // Return the message to the queue
                messageQueue.restoreMessage(this.fromId, webSocketMessage);

                // Close this connection
                this.close();
            }
        }
    }
}
