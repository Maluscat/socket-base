;
/**
 * Base class that should be extended.
 * Features base functionality such as the event and ping handlers.
 */
export class SocketBase {
    /** Object that is used in the ping payload. May not be changed. */
    static pingPayload = Uint8Array.of(0).buffer;
    #awaitPingTimeoutID = null;
    #eventList = {};
    /** Denotes whether the socket is in a timed out state. */
    isTimedOut = false;
    socket;
    constructor(socket) {
        this._messageIntercept = this._messageIntercept.bind(this);
        this._missedPing = this._missedPing.bind(this);
        this.socket = socket;
    }
    // ---- Ping handling ----
    /**
     * @internal
     * @param args Arguments that are passed on to the callback that
     *             has originally been defined in the message event.
     */
    async _messageIntercept(e, ...args) {
        // The frontend receives data as a Blob, the backend as an ArrayBuffer.
        if (e.data instanceof Blob || e.data instanceof ArrayBuffer) {
            let pingDataArr;
            if (e.data instanceof Blob && e.data.size === 1) {
                pingDataArr = new Uint8Array(await e.data.arrayBuffer());
            }
            else if (e.data instanceof ArrayBuffer && e.data.byteLength === 1) {
                pingDataArr = new Uint8Array(e.data);
            }
            if (pingDataArr && pingDataArr[0] === 0) {
                this._handleReceivedPing();
                return;
            }
        }
        this.invokeEvent('_originalMessage', e, ...args);
    }
    /**
     * Called internally whenever no pong has been received
     * in the required time frame after a ping.
     */
    _missedPing() {
        if (!this.isTimedOut) {
            this.invokeEvent('_timeout');
            this.isTimedOut = true;
        }
    }
    /**
     * Called whenever a ping has been received.
     * Can be extended with additional functionality.
     */
    _handleReceivedPing() {
        this.invokeEvent('_receivedPing');
        if (this.isTimedOut) {
            this.isTimedOut = false;
            this.invokeEvent('_reconnect');
        }
    }
    /**
     * Clears a potential previous ping timeout and starts a new one.
     * A ping timeout is the time frame in which a pong must be received.
     *
     * Must be called externally or from a super class.
     */
    _addPingTimeout(duration) {
        this._clearPingTimeout();
        this.#awaitPingTimeoutID = setTimeout(this._missedPing, duration);
    }
    /**
     * Clears a potential previous ping timeout.
     * @see {@link _addPingTimeout}
     */
    _clearPingTimeout() {
        if (this.#awaitPingTimeoutID != null) {
            clearTimeout(this.#awaitPingTimeoutID);
            this.#awaitPingTimeoutID = null;
        }
    }
    /**
     * Sends a ping.
     * A ping is always the same object defined in {@link pingPayload}.
     */
    sendPing() {
        if (this.socket?.readyState === 1) {
            this.socket.send(SocketBase.pingPayload);
            this.invokeEvent('_sentPing');
        }
    }
    // ---- Event handling ----
    /**
     * Add an event listener to the socket.
     * Accepts socket events (pass-thru) and custom events.
     * @see {@link CustomEventMap}
     */
    addEventListener(type, callback) {
        if (type === 'message') {
            this._addEvent('_originalMessage', callback);
            // @ts-ignore
            callback = this._messageIntercept;
        }
        this._addEvent(type, callback);
    }
    removeEventListener(type, callback) {
        if (type === 'message') {
            this._removeEvent('_originalMessage', callback);
            // @ts-ignore
            callback = this._messageIntercept;
        }
        this._removeEvent(type, callback);
    }
    _addEvent(type, callback) {
        if (!type.startsWith('_')) {
            // @ts-ignore
            this.socket?.addEventListener(...arguments);
        }
        if (!(type in this.#eventList)) {
            // @ts-ignore ???
            this.#eventList[type] = new Set();
        }
        // @ts-ignore ???
        this.#eventList[type].add(callback);
    }
    _removeEvent(type, callback) {
        if (!type.startsWith('_')) {
            // @ts-ignore
            this.socket?.removeEventListener(...arguments);
        }
        const callbacks = this.#eventList[type];
        callbacks?.delete(callback);
    }
    _addEventsAgain() {
        for (const [type, callbacks] of Object.entries(this.#eventList)) {
            if (!type.startsWith('_')) {
                callbacks.forEach(callback => {
                    this.socket?.addEventListener(type, callback);
                });
            }
        }
    }
    invokeEvent(type, ...args) {
        if (type.startsWith('_')) {
            this.#eventList[type]?.forEach(callback => {
                // @ts-ignore
                callback(...args);
            });
        }
    }
    removeAllEvents() {
        for (const [type, callbackList] of Object.entries(this.#eventList)) {
            for (const callback of callbackList) {
                this.removeEventListener(type, callback);
            }
        }
    }
}
