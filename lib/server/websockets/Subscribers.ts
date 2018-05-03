// tslint:disable:ban-types
// tslint:disable:prefer-const
import { WebSocketClient } from "./WebSocketClient";
import { WebSocketMessage } from "./WebSocketMessage";

export class Subscribers {

    private subscribers: Map<string, Map<string, WebSocketClient>> = new Map();

    public add(subjects: string[], client: WebSocketClient) {
        const subscribers = this.subscribers;

        for (let subject of subjects) {
            // Check if we have this subject
            if (!subscribers.has(subject)) {
                // Add if we don't
                subscribers.set(subject, new Map());
            }

            const clientMap = subscribers.get(subject);

            clientMap.set(client.id, client);
        }
    }
    public publish(publischingClient: WebSocketClient, message: WebSocketMessage) {
        const subscribers = this.subscribers;

        for (let subject of message.subjects) {
            // Check if we have this subject
            if (subscribers.has(subject)) {
                const map = subscribers.get(subject);

                for (let [key, socketClient] of map.entries()) {
                    if (socketClient !== publischingClient) {
                        socketClient.send(message);
                    }
                }
            }
        }
    }
    public remove(socketClient: WebSocketClient) {
        // Check in each collection
        for (let [key, map] of this.subscribers.entries()) {
            // Remove socket client
            map.delete(socketClient.id);
        }
    }
}
