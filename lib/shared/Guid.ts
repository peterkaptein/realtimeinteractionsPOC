// tslint:disable:no-bitwise
// tslint:disable:align
export class Guid {
    /**
     * will create a Guid.
     */
    public static create() {
        // http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript/2117523#2117523
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,  (placeholder) => {
            const randomNumber = Math.random() * 16 | 0;
            const result = placeholder === "x" ? randomNumber : (randomNumber & 0x3 | 0x8);
            return result.toString(16);
        });
    }
}
