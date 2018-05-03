import { Guid } from "../../shared/Guid";
import { WebSocketClient } from "./WebSocketClient";

export class WebSocketMessage implements IMessage {
    public static get INCOMING() { return "TYPE_INCOMING"; }
    public static get OUTGOING() { return "TYPE_OUTGOING"; }

    public static get ACTION_REGISTER() { return "ACTION_REGISTER"; }
    public static get ACTION_ACKNOWLEDGED() { return "ACTION_ACKNOWLEDGED"; }

    public static get bodySeparator() { return "[-O-]"; }


    public get messageId() { return this.messageid; }
    public fromId: string; // client
    public toId: string; // client
    public subjects: string[] = [];
    public body: any;
    public action: string = "";
    private messageid = Guid.create();

    constructor(rawMessage: any, type: string) {

        if (type === WebSocketMessage.INCOMING) {
            this.unpackIncomingMessage(rawMessage);
        } else {
            this.handleOutGoingMessage(rawMessage);
        }
    }

    public unpackIncomingMessage(rawMessage) {
        // Split message and get values from result, using array destructuring
        const [header, body] = rawMessage.split(WebSocketMessage.bodySeparator);

        // Set body
        try {
            this.body = JSON.parse(body);
        } catch (e) {
            // POC: We ignore errors on faulty messages. No acton required
        }


        let subjects = "";

        // Split header and set values in object
        [this.action, this.messageid, this.fromId, this.toId, subjects] = header.split(";");
        try {
            this.subjects = subjects.split(",");
        } catch (e) {
            // POC: We ignore errors on faulty content. No acton required
        }

        // Done.
    }
    public handleOutGoingMessage(rawMessage) {
        Object.assign(this, rawMessage);
    }

    public replyTo(messageId: string) {
        this.messageid = messageId;
    }
    public toString(): string {
        const header = [this.action, this.messageId, this.fromId, this.toId, this.subjects.join(",")].join(";");


        const body = JSON.stringify(this.body);

        return header
            + WebSocketMessage.bodySeparator
            + body;
    }

}


export interface IMessageContent {
    toId: string; // client
    subjects: string[];
    body: any;
}

export interface IMessage {
    fromId: string; // client
    toId: string; // client
    subjects: string[];
    body: any;
    action: string;
}
