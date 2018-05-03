// tslint:disable:trailing-comma
// tslint:disable:prefer-const
/**
 * truly private method to produce a class defintion form the list
 * POC. To be moved to DataBinding class
 */
const createClassDefinitions = (classes: IClass[]): IObjectDefintion[] => {
    const resultobjectTypes: IObjectDefintion[] = [];

    // Each class in the list is transformed into a class definition so we can easily create
    // new objects and understand what the name of the identity field is
    for (let Class of classes) {
        resultobjectTypes.push({
            className: Class.name,
            create: (obj: any) => new Class(obj),
            identityKey: Class.primaryKey
        }
        );
    }
    return resultobjectTypes;
};

/**
 * The DataStore helps us to manage objects on the client side
 *
 * Each store contains a map with several lists
 * Each list contains a set of objects of a specific class
 *
 * The DataStore helps us manage all objects,
 * to prevent having multiple instances of the same data items
 * and to update the individual objects with new data when those updates
 * are recieved from the server
 *
 * Handy when using a push-based system with Websockets
 * and shared data from several sources
 *
 */
export class DataStore {


    /**
     * Get the data store with the given store name
     *
     * @param storeName
     */
    public static get(storeName: string): DataStore {
        if (!DataStore.dataStores.has(storeName)) {
            DataStore.dataStores.set(storeName, new DataStore());
        }

        return DataStore.dataStores.get(storeName);
    }

    private static dataStores: Map<string, DataStore> = new Map();

    private store: Map<string, Map<string, any>> = new Map();
    private typeMap: Map<string, IObjectDefintion> = new Map();

    /**
     * Each store contains a map with several lists
     * Each list contains a set of objects of a specific class
     *
     * With setClassDefiniton, we pass the definition of that class.
     * This defintion describes amongst other things:
     * - How to create a new object of that specific type
     * - What the name of the primary key / identity key is.
     *
     * @param objectTypes
     */
    public setClassDefiniton(objects: IClass[]) {

        const objectTypes = createClassDefinitions(objects);
        // We overwrite if we already have it
        for (let objectType of objectTypes) {
            this.typeMap.set(objectType.className, objectType);
        }
    }

    /**
     * Get an object of a specific type from this store
     *
     * @param objectType
     * @param objectId
     */
    public get(objectType: string, objectId: string) {
        if (!this.store.has(objectType)) {
            return {};
        }

        const map = this.store.get(objectType);
        return map.get(objectId);
    }

    /**
     * getMap will return a map that contains objects of a specific type
     *
     * @param objectType the type of object we want the map of
     */
    public getMap(objectType: string) {
        if (!this.store.has(objectType)) {
            // Create map if not there
            this.store.set(objectType, new Map());
        }

        // Get and return map
        return this.store.get(objectType);

    }


    /**
     * process will process and store a list of objects of a specific type
     * If the objects are of generic type, process will cast them to the specific type
     *
     * @param objectList the list of objects to be processed
     * @param objectType the type of object we are processing
     */
    public process<T>(objectList: any[], objectType: string): T[] {

        const typeMap = this.typeMap;
        const store = this.store;

        const resultList: T[] = [];

        if (!typeMap.has(objectType)) {
            // Not in type map, nothing to process
            return objectList;
        }

        // Get all we need to create and identify objects
        const objectTypeDefinition = typeMap.get(objectType);
        const identityKey = objectTypeDefinition.identityKey;

        // Get map
        const map = this.getMap(objectType);

        // Run through the list of objects to process
        for (let obj of objectList) {
            // get ID
            const objectId = obj[identityKey];

            // Get mapped object
            let mapped = map.get(objectId);

            if (!mapped) {
                // Create new object of that type, using the anonymous object as input
                mapped = objectTypeDefinition.create(obj);
                // Add to map
                map.set(objectId, mapped);
            } else {
                // Make sure we are synchronized with what we receive from the server
                // So: assign all values from passed object to mapped object
                Object.assign(mapped, obj);
            }

            // Add mapped object to result list
            resultList.push(mapped);
        }

        return resultList;
    }
}

/**
 * The defintion of an object, stored in the data store
 * We will create those on the fly, so definition is that of object, not of class
 */
export interface IObjectDefintion {
    className: string; // The class name
    identityKey: string; // The name of the id field
    create: (object: any) => any;
}

export interface IClass {
    name: string;
    primaryKey: string;
    new(arg: any);

}
