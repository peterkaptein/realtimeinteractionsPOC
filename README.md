# Real time, cross browser interactons with simple socket server and web client

## About
This Proof of Concept is a personal project and created to explore simple ways to
* Create two-way databinding in the front
* Make any change in the page visible on other browsers on other computers, using events sent as messages via websockets

It is written as a personal exploration of what can be done with simple means. 

## Creating a component
To create a component, you define the template HTML and the component-specific settings. In tis case, we have some sub components.

```typescript
// Imports...
// Render-method, so we keep the component itself clean.
const renderPersonHtml=(component:BaseComponent,person:Person)=>{

    // PersonDirective simply returns rendered HTML, based on the input
    // This simplifies 
    let personDirective=new PersonDirective();

    // Template. The attributes object-type and obect-reference will be used as starting points for 2-way data binding
    let html=`<div 
        object-type="Person" 
        object-reference="${person.personId}">
        ${personDirective.render(person)}
        <!-- Assets! -->
        <div inject="assets" data-model=""></div>
        <!--Show popup from code in component!-->
        <button click="component.showPopup(${person.personId});">Popup!</button>
        <!-- Input! -->
        <p><input type="text" data-binding="firstname"><input type="text" data-binding="lastname"></p>
    </div>`

    // This will inject the HTML into our parent component
    return component.injectIntoTargetElement(html);
}

export class PersonComponent extends BaseComponent{

    personService:PersonService;

    constructor(parentId:string,renderTarget?:string){

        super({ 
                parentId, // Who is the parent?
                renderTarget, // Where do we render ourselves?
                objects:[Person],// What data are we rendering?
                subcomponents:[// Where do we wish to bind subcomponents?
                    ["assets", AssetsComponent]
                ]
            }
        ); 

        // Define the data service and other bindings
        this.personService=new PersonService();
    }

    // Render this module and all submodules
    public render( model:IRenderModel){
        // 
        this.personService.getPersonById(model.personId).then((person:Person)=>{

            // Update anything on screen, store in datastore
            this.dataBinding.process([person],Person);

            // Render, using the private method 
            // This will already create the 2-way bindings
            let component=renderPersonHtml(this,person);

            // This will render subcompoment
            this.sub<AssetsComponent>("assets").target(component).render(person);
        })
    }

    // Method we call from the template HTML
    public showPopup(personId){
        alert("personId="+personId);
    }


}

```
## Binding the component to HTML
Once defined, it can be bound to HTML in the following way, assuming that we have an elemnt in our HTML with the ID "myHtmlElementId":
```typescript
        // Create and bind module
        const personComponent = new PersonComponent("myHtmlElementId");

        // Render the content
        personComponent.render({personId:"1"});
```
## Sharing objects
To create the websocket connection client side, and receieve event messages, you can use:
```typescript
const socketClient=new WebSocketConnector(["item:mousemove","item:textinput","person:change"],"socketclientA");
// Open socket client and bind events from other clients to concrete actions
socketClient
    .openWebsocket('ws://localhost:2222')
    // Capture specific event
    .on("person:change",(message:WebSocketMessage)=>{
        // Define object type
        const type={name:"Person", primaryKey:"personId"}
        // Update the data store and update the HTML. Input is a list of objects, 
        // in this case message.body contains the person that was sent
        DataBinding.process(DataStore.get("myDatastore"), [message.body], type);
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

