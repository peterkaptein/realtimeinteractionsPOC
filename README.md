# Real time, cross browser interactons with simple socket server and web client

## About
This Proof of Concept is a personal project and created to explore simple ways to
* Create two-way databinding in the front
* Make any change in the page visible on other browsers on other computers, using events sent as messages via websockets

It is written as a personal exploration of what can be done with simple means. 

## Sharing objects
To create the websocket connection client side, and receieve event messages, you can use:
```typescript
const socketClient=new WebSocketConnector(["item:mousemove","item:textinput","person:change"],"socketclientA");
// Open socket client and bind events from other clients to concrete actions
socketClient
    .openWebsocket('ws://localhost:2222')
    // Capture specific event
    .on("person:change",(message:WebSocketMessage)=>{
        let person=message.body; // The object that was sent
        // Define object type
        const type={name:"Person", primaryKey:"personId"}
        // Update the data store and update the HTML. Input is a list of objects
        DataBinding.process(DataStore.get("myDatastore"), [person], type);
    })
```

To share user-events over multiple connected clients, you simply add the following code (example) to the constructor of your component:

```typescript
    // Get socket client
    this.socketClient=WebSocketConnector.getConnector("socketclientA");

    // Send user-created event (in this case: on key up) from databinding-object that is part of component
    this.dataBinding.onChange=(person:Person)=>{
        this.socketClient.send({
            body:person,
            subjects:["person:change"],
            toId:"" // We will not send it to one specific client, but to all
        })
    }
```


## Code
The code is broken into three parts:
* lib/client: A small client side framework to render HTML and do 2-way databinding with data objects
* lib/server: A small server side framework using websockets to share events between different browser clients
* lib/shared: A set of shared classes, written for convenience and as exploration of certain concepts 

