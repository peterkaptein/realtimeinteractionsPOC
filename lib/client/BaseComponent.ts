// tslint:disable:prefer-const

import { Guid } from "../shared/Guid";
import { DataBinding } from "./DataBinding";
import { DataStore, IClass, IObjectDefintion } from "./DataStore";


/**
 * Truly private method to instantiate and map subcomponents
 *
 * The binding to the render target in the component HTML is done via rendertarget
 *
 * @param module
 * @param subs
 */
const instantiateSubcomponents = (module: BaseComponent, subs: Array<[string, IComponentClass]>) => {
    const myMap: Map<string, BaseComponent> = new Map();
    if (!subs) {
        return myMap;
    }
    for (const [renderTarget, subComponent] of subs) {

        // Create a new subcomponent, bound to the id of this component
        myMap.set(renderTarget, new subComponent(module.componentId, renderTarget));
    }
    return myMap;
};

/*
    Each derived component will implement IComponentClass and offer two parameters for construction:
        parentId:string,
        renderTarget:string

    parentId refers to the parent container we will render the content in
    renderTarget is the target-element in that container.

    The rendertarget is marked with the inject-attribute. Like this:
    <div inject="myModule"></div>

    The concrete HTML-node is resolved when needed, based on the parentId.
    To make things more efficient for submodules, we can also set this concrete element using the target

    Like this:
        // Render subcomponent
        mySubComponent.target(myDOM_element).render(myModel);

    This will prevent the need to resolve the DOM element of the parent when we render.
 */

/**
 * BaseComponent contains all the necessary parts ot create and render components in the application.
 */
export class BaseComponent {

    public parentId: string;
    public componentId: string = Guid.create();
    public dataStore: DataStore;
    public subComponents: Map<string, BaseComponent> = new Map();

    protected parentElement: HTMLElement;
    protected htmlElement: HTMLElement;
    protected dataBinding: DataBinding;
    protected renderTarget: string;

    // What does the class look like, that we present in this module?
    private classDefinitons: IClass[];

    /**
     * Each derived class will create and pass a definition of the concrete component to this base class
     *
     * @param definition The definition of the component
     */
    constructor(definition?: IComponentDefintion) {

        const dataStoreName = definition.dataStoreName || "default";
        // Get datastore
        this.dataStore = DataStore.get(dataStoreName);

        // Add class defintions to datastore, so we can handle references in the code
        this.dataStore.setClassDefiniton(definition.objects);

        // Create databinding object
        this.dataBinding = new DataBinding(this);

        // Store defintions
        this.classDefinitons = definition.objects;
        this.renderTarget = definition.renderTarget;
        this.parentId = definition.parentId;
        this.subComponents = instantiateSubcomponents(this, definition.subcomponents);

    }


    /**
     * target is used to set an explicit render target for this component
     *
     * @param parentElement
     */
    public target(parentElement: HTMLElement) {
        this.parentElement = parentElement;
        return this;
    }

    /**
     * sub will return the subcomponent that belongs to the render target
     *
     * @param renderTarget the reference to the rendertarget in the template HTML
     */
    public sub<T>(renderTarget: string) {
        return (this.subComponents.get(renderTarget) as any) as T;
    }

    /**
     * getElement is a convenience method to get an element by the given ID
     *
     * @param elementId the ID of the element we want to get from the HTML
     */
    public getElement(elementId: string): HTMLElement {
        return document.getElementById(elementId);
    }

    /**
     * Rendertarget resolves the DOM object to render the HTML of this component in
     */
    public getRenderTarget(): HTMLElement {
        // Get container
        const componentContainer: HTMLElement = this.parentElement || this.getElement(this.parentId);

        // If target is undefined, we return the component container
        if (!this.renderTarget) {
            return componentContainer;
        }

        // Else: get first instance of target
        return componentContainer.querySelector(`*[inject='${this.renderTarget}']`) || componentContainer;
    }

    /**
     * The clearDOM call is made when the parent DOM object is removed
     * The onRemoved method in this class will clean up all dependencies once the component is removed from the DOM
     */
    public clearDOM() {
        // Remove when not removed yet
        if (this.htmlElement && this.htmlElement.parentElement) {
            this.htmlElement.parentElement.removeChild(this.htmlElement);
        }
    }

    /**
     * addToParentNode will add the rendered HTML to the DOM
     *
     * @param component the rendered component
     */
    public addToParentNode(component: HTMLElement) {

        // Find target element to place our component in
        const renderTarget = this.getRenderTarget();

        if (!renderTarget) {
            console.error(`HTML not rendered for component. Can't find render target: ${this.renderTarget}`);
            return;
        }

        // CLear HTML
        while (renderTarget.hasChildNodes()) {
            renderTarget.removeChild(renderTarget.lastChild);
        }

        // Add this module to render target
        renderTarget.appendChild(component);
    }

    /**
     * injectIntoTargetElement will inject the HTML into a component-element
     * and inject it into the target element.
     *
     * For further use it will return the DOM-element of the rendered component.
     *
     * @param moduleHtml the html to be rendered in the module
     */
    public injectIntoTargetElement(moduleHtml: string): HTMLElement {

        const parentElement = this.parentElement || this.getElement(this.parentId);

        // Reuse html element when there
        const myComponent = this.htmlElement = this.htmlElement || this.createNewComponent();

        // Set content to element and make it into what we rendered
        myComponent.innerHTML = moduleHtml;

        // Give the element an ID for reference
        myComponent.id = this.componentId;

        // Bind databinding listeners to component
        this.dataBinding.bindTo(myComponent);

        // Bind events to component
        this.addEventHandlers(myComponent);

        // Add to parent
        this.addToParentNode(myComponent);

        // Rebuild object-ID list, to skip databinding attempts on non-rendered objects
        this.dataBinding.processRenderChanges();

        return this.htmlElement;
    }

    /**
     * Each element in our rendered component, can have an action, like "click" or "mouse over"
     *
     * Here we find and bind those actions in such a way that we can refer methods in the componentn.
     *
     * The references are done via variables we define beforehand.
     * For example:
     * <div click="cmp.myClickAction(event)">  will actually refer to
     * 1: the cmp-variable, which refers to this component
     * 2: the event that occurred, which is passed in the constructor of the actual event handler in addEventHandlers
     *
     * @param renderedComponent the rendered component
     */
    protected addEventHandlers(renderedComponent: HTMLElement) {
        // For clarity later on
        const component = this;

        // Event handlers are limited for now (POC) and listed here
        // we will iterate through this list each time we create the element and want to limit overhead (POC)
        const events = ["reset", "submit", "keyup", "keydown", "click", "dblclick", "mouseover", "mouseout"];

        for (let eventname of events) {

            // Get elements with binding to event, from our rendered component
            const elementList: NodeListOf<HTMLElement> = renderedComponent.querySelectorAll(`*[${eventname}]`);

            // Set listener to each element
            for (const element of elementList) {

                // Create concrete method body, using the eventname for the eventslist
                const expectedAction = `
                // Below are the bindings to use when executing the action
                // using the arguments given on call
                let event=arguments[0];
                let component=arguments[1];
                let cmp=component; // To offer a shorthand name
                let from=arguments[2];

                // This is the action as presented in the template HTML:
                ${element.getAttribute(eventname)}`;

                // Create eventHandler from string value
                const eventHandler = Function(expectedAction);

                // Add eventHandler to element
                element.addEventListener(eventname, (event: Event) => {

                    // Pass relevant values to fire the eventhandler we constructed above
                    // and return result if there
                    return eventHandler(event, component, element);
                });
            }
        }
    }

    /**
     * createNewComponent will create a new component element and attach an event listener for removal
     */
    protected createNewComponent(): HTMLElement {
        const newComponent = document.createElement("component");
        // Attach listener so we can properly handle removal of dom node
        newComponent.addEventListener("DOMNodeRemoved", (event: Event) => this.onRemoved(event), false);

        return newComponent;
    }

    /**
     * When a DOM node is removed from the DOM, this is execud
     *
     * @param event the remove-event
     */
    protected onRemoved(event: Event): boolean {

        // Not us?
        if (event.target !== this.htmlElement) {
            return;
        }

        // We reached target
        event.stopPropagation();

        // Remove DomNode reference so garbage collection can do its work
        this.htmlElement = null;
        this.parentElement = null;

        // Remove subcomponents from DOM
        for (const [key, component] of this.subComponents) {
            component.clearDOM();
        }

        // Stop doing anything else on this event
        return false;
    }
}


/**
 * The abstract definition of a component class, so we can pass a class in a defintion and instantiate it elsewhere
 */
interface IComponentClass {
    name: string;
    new(parentId: string, renderTarget: string);

}

/**
 * The defintiion of a component
 */
interface IComponentDefintion {
    parentId: string;
    renderTarget: string;
    objects: IClass[];
    subcomponents?: Array<[string, IComponentClass]>;
    dataStoreName?: string;
}
