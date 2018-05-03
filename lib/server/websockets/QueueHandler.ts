import { WebSocketMessage } from "./WebSocketMessage";

export class QueueHandler {
    private queue: Map<string, WebSocketMessage[]> = new Map();


    public addMessage(fromId: string, message: WebSocketMessage) {
        const queue = this.assureQueue(fromId);

        queue.push(message);
    }
    public getMessage(fromId: string): WebSocketMessage {
        const queue = this.assureQueue(fromId);
        return queue.shift();
    }
    public restoreMessage(fromId: string, message: WebSocketMessage) {
        const queue = this.assureQueue(fromId);

        queue.unshift(message);
    }
    public length(fromId: string): number {
        const queue = this.assureQueue(fromId);
        return queue.length;
    }

    private assureQueue(fromId): WebSocketMessage[] {
        const queue = this.queue;
        if (!queue.has(fromId)) {
            queue.set(fromId, []);
        }
        return queue.get(fromId);
    }
}
