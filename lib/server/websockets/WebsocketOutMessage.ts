import { IMessage, WebSocketMessage } from "./WebSocketMessage";

export class OutgoingWebsocketMessage extends WebSocketMessage {
    constructor(rawMessage: IMessage) {
        super(rawMessage, WebSocketMessage.OUTGOING);
    }
}
