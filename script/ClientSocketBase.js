import { SocketBase } from './SocketBase.js';
/**
 * Client implementation of the SocketBase, handling automatic
 * ramping-up reconnection attempts, among other things.
 * @see {@link SocketBase}
 */
export class ClientSocketBase extends SocketBase {
    #reconnectTimeoutID = null;
    #reconnectTimeoutDuration;
    /** Counts the first two pings to coordinate the timings setup. */
    #pingSetup = 0;
    /** Timestamp of the last received ping. Used for calculating the timings. */
    #lastPingTimestamp = 0;
    /**
     * Median interval of the received pings,
     * with a weight favoring the most recent pings.
     */
    medianPingInterval = 0;
    /**
     * Maximum timeout between reconnection attempts in milliseconds.
     *
     * Setting this to a negative value disables all reconnection attempts.
     *
     * @see {@link minReconnectTimeoutDuration}
     */
    maxReconnectTimeoutDuration;
    /**
     * Minimum timeout between reconnection attempts in milliseconds.
     *
     * After each failed reconnection attempt, the effective timeout is
     * doubled, reaching a cap at {@link maxReconnectTimeoutDuration}.
     */
    minReconnectTimeoutDuration;
    /** Used socket URL. Changing it will only be reflected after a reconnect. */
    socketURL;
    constructor(url, { maxReconnectTimeoutDuration = 10000, minReconnectTimeoutDuration = 750, } = {}) {
        super(null);
        this._socketClosed = this._socketClosed.bind(this);
        this._socketConnected = this._socketConnected.bind(this);
        this.socketURL = url;
        this.maxReconnectTimeoutDuration = maxReconnectTimeoutDuration;
        this.minReconnectTimeoutDuration = minReconnectTimeoutDuration;
        this.#reconnectTimeoutDuration = minReconnectTimeoutDuration;
        this.addEventListener('open', this._socketConnected);
        this.addEventListener('close', this._socketClosed);
    }
    // ---- Utility methods ----
    /** Socket pass-thru. Sends the specified message. */
    send(message) {
        if (!this.socket) {
            throw new Error("ClientSocketBase @ send: No socket defined. Initialize a new socket first.");
        }
        else {
            this.socket.send(message);
        }
    }
    /**
     * Convenience method. Sends the stringified specified data object
     * with the added field `evt` set to the specified event string.
     */
    sendEvent(eventType, data = {}) {
        // @ts-ignore
        data.evt = eventType;
        this.send(JSON.stringify(data));
    }
    // ---- Connection handling ----
    /**
     * Initialize a new connection, overwriting the current {@link socket}.
     * Does not close or cancel any currently existing socket connnection.
     */
    initializeConnection() {
        this.socket = new WebSocket(this.socketURL);
        this._addEventsAgain();
    }
    _socketClosed(e) {
        this.#trySocketReconnect();
        this._clearPingTimeout();
    }
    _socketConnected() {
        this.stopReconnectionAttempt();
        this.isTimedOut = false;
    }
    /** Stop trying to reconnect immediately. */
    stopReconnectionAttempt() {
        this.#reconnectTimeoutDuration = this.minReconnectTimeoutDuration;
        if (this.#reconnectTimeoutID != null) {
            clearTimeout(this.#reconnectTimeoutID);
            this.#reconnectTimeoutID = null;
        }
    }
    #trySocketReconnect() {
        if (this.maxReconnectTimeoutDuration >= 0) {
            this.#reconnectTimeoutID = setTimeout(() => {
                this.initializeConnection();
                this.#reconnectTimeoutDuration =
                    Math.min(this.maxReconnectTimeoutDuration, this.#reconnectTimeoutDuration * 2);
            }, this.#reconnectTimeoutDuration);
        }
    }
    // ---- Ping handling ----
    _handleReceivedPing() {
        const currentTime = new Date().getTime();
        if (this.isTimedOut) {
            this.#resetTimings();
        }
        else {
            const timeElapsed = new Date().setTime(currentTime - this.#lastPingTimestamp);
            this.#setTimings(timeElapsed);
        }
        this.#lastPingTimestamp = currentTime;
        this.sendPing();
        super._handleReceivedPing();
    }
    /**
     * Setup or calculate all the timings.
     * @see {@link medianPingInterval}
     */
    #setTimings(timeElapsed) {
        if (this.#pingSetup <= 1) {
            if (this.#pingSetup === 1) {
                this.medianPingInterval = timeElapsed;
            }
            this.#pingSetup++;
        }
        else {
            this.medianPingInterval = (this.medianPingInterval * 4 + timeElapsed * 1) / 5;
            this._addPingTimeout(this.medianPingInterval * 1.2);
        }
    }
    #resetTimings() {
        this.#pingSetup = 0;
    }
}
