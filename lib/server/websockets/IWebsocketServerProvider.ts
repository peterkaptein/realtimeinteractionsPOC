// tslint:disable:ban-types
export interface IWebsocketServerProvider {
    start(port: number, registerNewClient: Function);
}
