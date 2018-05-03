// tslint:disable:prefer-const
import { Guid } from "../shared/Guid";
import { BaseComponent } from "./BaseComponent";
import { DataStore, IClass } from "./DataStore";


// Private methods
// Get container with object reference
const findContainer = (element: Element, originalElement: Element = null): Element => {

    if (!originalElement) {
        originalElement = element;
    }
    if (!element) {
        // tslint:disable-next-line:no-string-throw
        throw `object-reference is not set in the container of the Element with data-field set as:
        ${originalElement.getAttribute("data-field")} that triggered the event`;
    }

    const dataBinding = element.getAttribute("object-reference");

    if (!dataBinding) {
        return findContainer(element.parentElement, originalElement);
    }

    return element;
};

const getUniqueIdentifier = (element: Element) => {
    return element.getAttribute("object-type") + "." + element.getAttribute("object-reference");
};
const getUniqueIdentifierFromString = (objectType: string, objectReference: string) => {
    return objectType + "." + objectReference;
};
const getElemntId = (objectType: string, objectReference: string, dataBindingField: string) => {
    return getUniqueIdentifierFromString(objectType, objectReference) + "." + dataBindingField;
};

/**
 * DataBinding deals with all actions required to do 2 way databinding
 * between the data and the rendered HTML in the component
 */
export class DataBinding {
    /**
     * Static Process is used as a global convenience method
     * It will store all objects in the DataStore and update the view with any object in the list
     *
     * @param dataStore the datastore to use
     * @param list the list of raw items to process
     * @param type the type of item
     */
    public static process<T>(dataStore: DataStore, list: T[], type: IClass): T[] {
        // Process raw list
        const result = dataStore.process<T>(list, type.name);

        // Then update anything that reflects one of the objects
        for (let obj of result) {
            DataBinding.updateObjectInHtml(null, type.name, type.primaryKey, obj);
        }

        return result;
    }

    /**
     * static method for global updates
     * When an object-value is updated, we will attempt to update
     * all instances of that object-value everywhere in the rendered HTML
     *
     * @param eventDispatcher : the dispatcher of the event that caused the change
     * @param elementId : the element we wanrt to update
     * @param object : the object that has changed
     * @param container : the container in which we want to operate - by default/null all
     */
    public static updateValueInHtml( eventDispatcher: Element, elementId: string, object: any, container: HTMLElement = document.body as HTMLElement) {

        const elementList: NodeListOf<Element> = container.querySelectorAll(`*[element-id='${elementId}']`);
        this.injectDataIntoHtml(eventDispatcher, object, elementList);
    }

    /**
     * static method for global updates
     * When an object is updated, we will attempt to update all instances of that object
     *
     * @param eventDispatcher : the dispatcher that sent the event
     * @param objectType : the type of object that has been updated
     * @param objectId : the Id of the updated object
     * @param object : the object
     * @param container : the container in which the object was updated
     */
    public static updateObjectInHtml(eventDispatcher: Element, objectType: string, objectId: string, object: any, container: HTMLElement = document.body as HTMLElement) {

        // We only update objects which are rendered
        if (!DataBinding.presentedIdentities.has(getUniqueIdentifierFromString(objectType, objectId))) {
            // Object with that ID is not rendered. Exit
            return;
        }

        // Use query to get all elements bound to the object, using object type and object Reference
        const elementList: NodeListOf<Element> = container.querySelectorAll(`*[object-type='${objectType}'][object-reference='${objectId}'][data-binding]`);

        // Inject the (updated) data from the object into the rendered element
        this.injectDataIntoHtml(eventDispatcher, object, elementList);
    }

    /**
     * static method for global updates
     * Update the rendered instances of the object everywhere in the HTML
     *
     * @param eventDispatcher : the dispatcher of the event that caused the change
     * @param object : the object that has changed
     * @param elementList : the list of rendered elements that present a value from the object
     */
    public static injectDataIntoHtml( eventDispatcher: Element, object: any, elementList: NodeListOf<Element>) {

        for (let element of elementList) {

            // We do an all in update, not just the single field that might have changed
            if (element !== eventDispatcher) {
                // Get field name
                const dataBindingField = element.getAttribute("data-binding");

                // Get value from object
                const objectValue = object[dataBindingField];

                let displayType = element.getAttribute("type") || element.nodeName.toLowerCase();

                switch (displayType) {
                    case "input":
                    case "text":
                        (element as HTMLInputElement).value = objectValue;
                        break;
                    case "checkbox":
                        (element as HTMLInputElement).checked = objectValue;
                        break;
                    case "radio":
                        const radio = (element as HTMLInputElement);
                        const value = radio.value;

                        if (value === objectValue) {
                            radio.checked = true;
                        } else {
                            radio.checked = false;
                        }
                        break;
                    default:
                        element.innerHTML = objectValue;
                        break;
                }
            }
        }
    }
    // Set of all guids presented on screen
    private static presentedIdentities: Set<string> = new Set();

    private htmlElement: HTMLElement;

    private dataStore: DataStore;
    private componentId: string;
    private component: BaseComponent;

    constructor(component: BaseComponent) {
        this.component = component;
        this.dataStore = component.dataStore;
        this.componentId = component.componentId;
    }

    /**
     * Local process-method that will update the data store with the objects we receive in the list
     *
     * @param list
     * @param type
     */
    public process<T>(list: T[], type: IClass): T[] {

        return DataBinding.process<T>(this.dataStore, list, type);

    }

    /**
     * Get Element is a convenience method to get an element from the DOM
     *
     * @param elementId
     */
    public getElement(elementId: string): HTMLElement {
        return document.getElementById(elementId);
    }

    /**
     * getObjectContainer is a conventionece method to get an object container from a component
     *
     * Each object container contains one single object and is
     *
     * @param componentId : the ID id of the component we want to get
     * @param objectId : the ID of the object of which we want the specific container
     */
    public getObjectContainer(componentId: string, objectId: string) {
        const componentContainer: Element = this.getElement(componentId);
        return componentContainer.querySelector(`*[element-type='container'][object-reference='${objectId}']`);
    }

    /**
     * bindTo binds all required events from- and all required identifiers to the rendered HTML,
     *
     * So we automatically handle key-up events in input fields and have detailed object references
     * to make 2 way databinding easier
     *
     * This is a first proof of concept, based on a simple way of databinding, using the DOM
     *
     * @param component
     */
    public bindTo(component: HTMLElement) {

        // Get all input fields
        const inputFieldList: NodeListOf<Element> = component.querySelectorAll(`input[data-binding]`);

        // Bind events to handler
        for (let input of inputFieldList) {
            input.addEventListener("keyup", (event: Event) => {
                this.onFieldUpdate(event);
            });
        }

        // Get all containers in component
        const containerList: NodeListOf<Element> = component.querySelectorAll(`*[object-reference]`);

        // Assign all attributes to all relevant elements, so we can use them for data binding
        for (let container of containerList) {
            const objectType = container.getAttribute("object-type");
            const objectReference = container.getAttribute("object-reference");

            // Inject element type, so we can query on that later
            container.setAttribute("element-type", "container");

            // Get all elements with databinding insoude our component
            const dataBoundElements: NodeListOf<Element> = component.querySelectorAll(`*[data-binding]`);

            // Let each element in the container inherit object type and object reference
            // so we can do databinding
            for (let element of dataBoundElements) {
                element.setAttribute("object-type", objectType);
                element.setAttribute("object-reference", objectReference);
                element.setAttribute("element-id", getElemntId(objectType, objectReference, element.getAttribute("data-binding")));
            }
        }
    }

    /**
     * Abstract method.
     * For each component that is instantiated, we override the onChange method for concrete implementation
     *
     * @param obj : the object that changed
     * @param objectType : the type of the object
     */
    public onChange(obj: any, objectType: string) {
        // override this
    }

    /**
     * processRenderChanges is called when the HTML has been rendered to the screen.
     *
     * To make data binding more efficient, we collect an identifier-list of rendered objects
     *
     * So when we get an update of a list of objects, we can first check which are actually present
     * Instead of blindly just try update anything
     */
    public processRenderChanges(): Set<string> {

        const presentedIdentities = DataBinding.presentedIdentities = new Set();
        // Get all obejct references
        // We set element-type='container' to container in bindTo step of DataBinding
        const containerList: NodeListOf<Element> = document.body.querySelectorAll(`*[element-type='container'][object-reference]`);

        // Build a list of all identities we have now
        for (let element of containerList) {
            presentedIdentities.add(getUniqueIdentifier(element));
        }

        return presentedIdentities;
    }

    /**
     * onFieldUpdate is bound to all input-elements, using the key-up event
     * It will handle databinding to the object and the data field that is bound to that input field
     *
     * @param event : the event that caused an object to be updated
     */
    public onFieldUpdate(event: Event) {
        const updatedElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

        // Get field name
        const dataBindingField = updatedElement.getAttribute("data-binding");

        // Get classname and object ID
        const objectType: string = updatedElement.getAttribute("object-type");
        const objectId: string = updatedElement.getAttribute("object-reference");
        const elementId: string = updatedElement.getAttribute("element-id");

        const dataStore = this.dataStore;

        const obj = dataStore.get(objectType, objectId);

        // Convenience method
        const setValue = (value) => {
            obj[dataBindingField] = value;
        };

        const displayType = updatedElement.getAttribute("type") || updatedElement.nodeName.toLowerCase();

        switch (displayType) {
            case "input":
            case "text":
            case "radio":
                setValue(updatedElement.value);
                break;
            case "checkbox":
                setValue(updatedElement.checked);
                break;
            case "textarea":
                setValue(updatedElement.innerHTML);
                break;
        }

        // Update object in store
        dataStore.process([obj], objectType);

        this.onChange(obj, objectType);

        // Update all object references in HTML
        DataBinding.updateValueInHtml(updatedElement, elementId, obj);
    }
}
