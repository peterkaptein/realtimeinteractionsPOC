// tslint:disable:ban-types
// tslint:disable:object-literal-sort-keys
// tslint:disable:prefer-const
import { IMessageContent, WebSocketMessage } from "../../lib/server/websockets/WebSocketMessage";
import { OutgoingWebsocketMessage } from "../../lib/server/websockets/WebsocketOutMessage";
import { Guid } from "../../lib/shared/Guid";
import { Observable, Observer } from "../../lib/shared/Observable";

/**
 * The Websocket Connector provides a simple interface to send and receive messages
 * over a websocket connection, using subscriptions to subscribe itself to specific "events"
 *
 * Using socketClient.on("eventname"), the programmer can add specific handlers to remote events to respond to.
 *
 * example:
 *
 *      var socketClient=new WebSocketConnector(["item:mousemove","item:textinput"],"socketclient");
 *      socketClient
 *           .openWebsocket("ws://localhost:2222")
 *           .on("item:mousemove",(message:WebSocketMessage)=>{
 *               let position=message.body;
 *               moveDiv(position);
 *           })
 *           .on("item:textinput",(message:WebSocketMessage)=>{
 *               let input=message.body;
 *               setText(input);
 *           })
 */

export class WebSocketConnector {

    /**
     * getConnector will return a connector with a specific ID
     *
     * @param id
     */
    public static getConnector(id) {
        return WebSocketConnector.connectors.get(id);
    }

    /**
     * All connectors
     */
    private static connectors: Map<string, WebSocketConnector> = new Map();

    private webSocket: WebSocket;
    private guid = Guid.create();
    private observable: Observable;
    private events: Map<string, Set<Function>> = new Map();
    private subscribeMessage: OutgoingWebsocketMessage;

    /**
     *
     * @param subjects the subjects we want to subscribe to
     * @param connectorId the human readable ID of this connector
     */
    constructor(private subjects: string[], connectorId: string) {

        // Register connector
        WebSocketConnector.connectors.set(connectorId, this);

        // get GUID for unique reference and reflection server side
        const myGuid = this.guid;

        // The message we use to subscribe to events on the server
        this.subscribeMessage = new OutgoingWebsocketMessage({
            fromId: myGuid,
            action: WebSocketMessage.ACTION_REGISTER,
            subjects,
            toId: "",
            body: "" });

    }

    /**
     * addSubjects will register more subjects the socket client will listen to.
     *
     * @param subjects a list of subjects we want to subscribe to
     */
    public addSubjects(subjects: string[]): WebSocketConnector {
        const myGuid = this.guid;

        const subscribeMessage = new OutgoingWebsocketMessage({
            fromId: myGuid,
            action: WebSocketMessage.ACTION_REGISTER,
            subjects,
            toId: "",
            body: "" });
        this.webSocket.send(subscribeMessage.toString());

        return this;
    }

    /**
     * on() is used to register an eventhandler for a specific event that is received from the server.
     *
     * Any event that we did not register to on initialization or via addSubjects,
     * will not be sent to this client
     *
     * @param eventName the name of the event we want to handle
     * @param action the action to be performed when the event of the given name is received from the server
     * @param isGlobal we will register only one handler for this event
     */
    public on(eventName: string, action: Function, isGlobal: boolean = false): WebSocketConnector {
        const events = this.events;
        if (!events.has(eventName)) {
            events.set(eventName, new Set());
        }


        const set = events.get(eventName);

        // If this is a global event, then only one instance is registered
        if (isGlobal) {
            if (set.size === 1) {
                return this;
            }
        }

        // We can add action to set
        set.add(action);
        return this;
    }

    /**
     * dispatch will dispatch an event for each subject in that message.
     *
     * In other words: one message can cover several subjects and thus trigger several events.
     *
     * @param message the message we received
     */
    public dispatch(message: WebSocketMessage) {
        for (let subject of message.subjects) {
            if (this.events.has(subject)) {
                const set = this.events.get(subject);
                for (let action of set) {
                    action(message);
                }
            }
        }
    }

    /**
     * send will send the message to the socket server
     *
     * @param messageContent the raw content of the mesage we want to send
     */
    public send(messageContent: IMessageContent) {

        // Construct the real message
        const message = new OutgoingWebsocketMessage({
            // Copy body, soubjects and toId from content
            subjects: messageContent.subjects,
            body: messageContent.body,
            toId: messageContent.toId,
            fromId: this.guid,
            action: "" }); // This is not a specific message

        // Send it over the websocket
        // Right now (proof of concept) we only send string values.
        this.webSocket.send(message.toString());
    }

    /**
     * openWebsocket will attempt to open the websocket
     *
     * @param location the websocket location
     */
    public openWebsocket(location: string): WebSocketConnector {

        // Create WebSocket connection.
        const socket = this.webSocket = new WebSocket(location);

        // Create a clear reference for later use
        const socketClient = this;

        // Connection opened
        socket.addEventListener("open", (event) => {
            socket.send(this.subscribeMessage.toString());
        });

        // Try reconnect in case of unvoluntary disconnect (POC)
        socket.addEventListener("error", (event) => {
            // console.log("Message from server ", event);
            socket.close();

            setTimeout(() => {
                this.openWebsocket(location);
            }, 100);
        });

        // Create observable
        this.observable = new Observable(
            // The stuff we will be observing
            (observer: Observer) => {

                // Listen for messages
                socket.addEventListener("message", (event) => {

                    // Parse the message
                    const message = new WebSocketMessage(event.data, WebSocketMessage.INCOMING);

                    // Dispatch it as event
                    socketClient.dispatch(message);

                    // Pass it to the observer as well
                    observer.next(message);
                });
                // Listen for close
                socket.addEventListener("close",  (event) => {
                    // console.log("Message from server ", event.reason);
                    observer.error({ message: "Socket closed", event });
                });
            },
            false, // Not a single event observer, but continuous
            // Inherit observers if there already was an observable
            // There might be a better solution dealing with observables in these cases
            this.observable);

        // In case we want to chain more things to our websocket connector
        return this;
    }

    /**
     * In the basis, the websocket is an observable
     * Subscribers will receive all messages from the server, regardless of their subject
     *
     * @param success the method to handle the success data
     * @param error the method to handle the error data
     */
    public subscribe(success: Function, error: Function): WebSocketConnector {
        this.observable.subscribe(success, error);

        // In case we want to chain more things to our websocket connector
        return this;
    }
}
