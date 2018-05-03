import { CallBack } from "./Types";

// tslint:disable:prefer-const


/**
 * Observable is a simple implementation of the Observer-pattern.
 * Created for exercisepurposes
 */
export class Observable {

    public observer: Observer;
    constructor(observableProcess: (observer: Observer) => void , singleEvent: boolean = true, observable: Observable = null) {

        const observer = this.observer = new Observer(singleEvent);

        if (observable) {
            this.inheritObservers(observable);
        }

        // Start process, using the observer we created
        observableProcess(observer);
    }

    /**
     * adds a subscriber to the observer
     *
     * @param success method executed on success
     * @param error method executed on error
     */
    public subscribe(success: CallBack, error: CallBack) {
        this.observer.add({ success, error });

        // In case we want to chain for whatever reason
        return this;
    }

    /**
     * In some cases, we want to create a new observable that inherits the observers from the previous obervable
     *
     * @param inheritFrom the observable we want to inherit the observers from
     */
    public inheritObservers(inheritFrom: Observable) {
        this.observer.observers = inheritFrom.observer.observers;

        // We no longer need that observer, so clean it out
        inheritFrom.discard();
    }

    /**
     * clears the observable so it will be properly collected
     */
    public discard() {
        this.observer.discard();
    }

}
export class Observer {
    public observers: Set<IObserver> = new Set();

    constructor(private singleEvent: boolean) {

    }

    public add(obs: IObserver) {
        this.observers.add(obs);
    }
    public next(result: any) {

        for (let observer of this.observers) {
            observer.success(result);
        }
        if (this.singleEvent) {
            this.discard();
        }
    }
    public error(result: any) {
        for (let observer of this.observers) {
            if (observer) {
                observer.error(result);
            }
        }

        if (this.singleEvent) {
            this.discard();
        }
    }

    public discard() {
        // Remove outside references for garbage collection
        this.observers.clear();
    }
}


interface IObserver {
    success: CallBack;
    error: CallBack;
}
