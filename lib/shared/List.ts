// tslint:disable:ban-types
/**
 * List is using some principles from C# collections,
 * including some Linq convenience with sorting and transforming data
 *
 * POC. Sorting not working yet
 */
export class List<T> {


    private list: T[] = [];

    /**
     * If we pass a list, that will be the starting point
     *
     * @param list : a list of objects
     */
    constructor(list: T[] = []) {
        this.list = list;
    }

    /**
     * add will add an item to the list
     *
     * @param item : the item to add
     */
    public add(item: T) {
        this.list.push(item);
    }

    /**
     * addAtStart will add the item to the start
     *
     * @param item : the item to add
     */
    public addAtStart(item: T) {
        this.list.unshift(item);
    }

    // Make the List iterable
    public [Symbol.iterator](): Iterable<T> {
        return this.list;
    }

    /**
     * where() filters the existing list and returns a new set
     */
    public where(filterMethod: Function): List<T> {

        // Get the items that comply to the where-clause given in the passed method
        const result: T[] = this.list.map((item, index, array) => {
            if (filterMethod(item)) {
                return item;
            }
        });

        // The result shoukd not influence our source list
        return new List(result);
    }

    /**
     * Orderby will sort the list, based on the fields passed in the orderby parameter
     *
     * adding asc / desc will determine the sort order per field
     *
     * Example:
     *      mylist.orderBy("firstname asc, lastname desc")
     *
     *
     * @param orderFieldList
     */
    public orderBy(orderFieldList: string): List<T> {

        // Build a sort-chain that will execute the sorting in the order of the given variables
        const sortChain = SortChainObject.build(orderFieldList);

        // Copy the current array
        const list = [...this.list];

        // Execute the sort
        list.sort((a, b) => {
            return sortChain.getsortableValue(a, b);
        });

        // Return the result as a new list, so we won't change the original
        return new List(list);
    }

    /**
     * transform will transform the data in the list to something else, as defined in the tranform method
     *
     * @param transformMethod : the method used to transform the data in the list to something else
     */
    public transform(transformMethod: Function): any[] {
        // This will return an array of any sort, based on the method we are executing
        const result: any[] = [];

        // Add the transformed result into the array
        this.list.forEach((item, index) => {
            if (item) {
                result.push(transformMethod(item, index));
            }
        });

        // In contrary to most other methods, this is not a List, but an array
        return result;
    }
}

/**
 * SortChainObject is a private class, to create the sort chain
 *
 * As sorting can be done over several fields, defined by a string-variable,
 * we use the SortChainObject and that string to create a sort chain.
 *
 * Each element in the chain will check whether the compare-values for that specific part in the chain are equal or not.
 * If not equal, the chain ends there. If equal, we move to the next part in the chain.
 */
class SortChainObject {

    /**
     * static method build() will build the sort chain, based on the sortByValues.
     *
     * @param sortByFields  a comma-separated list of fields to sort by
     */

    public static build(sortByFields: string) {

        const orderSet = sortByFields.split(",");

        // Define root object in chain
        const sortChain = new SortChainObject();

        // Create the chain to order our values
        orderSet.forEach((orderby, index) => {

            sortChain.add(new SortChainObject(orderby));

        });

        return sortChain;
    }

    public isRoot: boolean = false;
    public orderByVar: string = "";
    public sortorder: number = 1;
    private next: SortChainObject;


    /**
     * Prepare the chain
     *
     * @param orderby
     */
    constructor(orderby = "") {

        orderby = orderby.trim();

        const orderByParts = orderby.split(" ");
        this.orderByVar = orderByParts[0];

        // We ask things to be sorted in reverse order
        if (orderByParts[1] && orderByParts[1].toLowerCase() === "desc") {
            this.sortorder = -1;
        }
    }

    public add(chainObject: SortChainObject) {
        if (this.next) {
            // Add it to next in chain
            this.next.add(chainObject);

            // This will trickle it down until we reach the last in the chain
        } else {
            // Set next object to be the given object
            this.next = chainObject;
        }

    }

    public getsortableValue(valueA, valueB) {
        // Root? Execute next and done.
        if (this.isRoot) {
            return this._doNext(valueA, valueB);
        }


        const orderByField = this.orderByVar;

        // Not root. Sort, using the variable
        const A = valueA[orderByField];
        const B = valueB[orderByField];

        if (A == null || A === undefined) { // Lowest vale is undefined / empty
            return -1 * this.sortorder;
        }

        if (B == null || B === undefined) { // Lowest vale is undefined / empty
            return 1 * this.sortorder;
        }

        if (A.sortableValue() < B.sortableValue()) {
            return -1 * this.sortorder;
        }

        if (A.sortableValue() > B.sortableValue()) {
            return 1 * this.sortorder;
        }

        // Items are of equal value
        // Go to next sort item to see if we have subsort
        // If not, we return 0
        return this._doNext(valueA, valueB);
    }
    private _doNext(valueA, valueB) {
        if (!this.next) {
            // Done.
            return 0;
        }

        // Return result of next sort step
        return this.next.getsortableValue(valueA, valueB);
    }
}
