import { SocketBase } from './SocketBase.js';
/**
 * Server implementation of the SocketBase.
 *
 * This class is responsible for sending pings and reacting with a
 * timeout once a pong has not been received in the given threshold.
 *
 * @see {@link SocketBase}
 */
export class ServerSocketBase extends SocketBase {
    #pingIntervalHasChanged = false;
    #pingIntervalID;
    // @ts-ignore Propagated by getter/setter
    #pingInterval;
    /**
     * Amount of time in milliseconds that is waited for a ping response.
     * If no response comes within this window, a `timeout` event will be
     * invoked and a reconnection attempt is started.
     */
    pingTimeout;
    /**
     * Interval in milliseconds in which to send a ping.
     * Can be changed on the fly, in which case the interval becomes
     * active once the currently awaited ping has fired.
     *
     * Set to 0 to disable.
     * @default 0
     * @type { number }
     */
    get pingInterval() {
        return this.#pingInterval;
    }
    set pingInterval(val) {
        const currentVal = this.#pingInterval;
        if (val !== currentVal) {
            this.#pingIntervalHasChanged = true;
            this.#pingInterval = val;
            if (currentVal === 0) {
                this.#startPingInterval();
            }
        }
    }
    constructor(socket, { pingInterval = 0, pingTimeout = 3000, } = {}) {
        super(socket);
        this._socketClosed = this._socketClosed.bind(this);
        this._socketConnected = this._socketConnected.bind(this);
        this.sendPing = this.sendPing.bind(this);
        this.pingTimeout = pingTimeout;
        this.pingInterval = pingInterval;
        this.addEventListener('open', this._socketConnected);
        this.addEventListener('close', this._socketClosed);
    }
    _socketClosed(e) {
        this.stopPingImmediately();
    }
    _socketConnected() {
        this.#startPingInterval();
    }
    _handleReceivedPing() {
        super._handleReceivedPing();
        this._clearPingTimeout();
    }
    /**
     * Sends a ping as per the corresponding super method and
     * activates a timeout that will send a `_timeout` event
     * when no pong has been received in time.
     *
     * @see {@link SocketBase.sendPing}
     */
    sendPing() {
        super.sendPing();
        if (this.#pingIntervalHasChanged) {
            this.restartPingInterval();
        }
        this._addPingTimeout(this.pingTimeout);
    }
    /**
     * Stop an ongoing ping interval immediately, without
     * waiting for the current interval to finish.
     */
    stopPingImmediately() {
        if (this.#pingIntervalID != null) {
            clearTimeout(this.#pingIntervalID);
            this.#pingIntervalID = null;
        }
        this.#pingIntervalHasChanged = false;
    }
    #startPingInterval() {
        if (this.#pingInterval > 0) {
            this.#pingIntervalID = setInterval(this.sendPing, this.#pingInterval);
        }
    }
    /** Stop an ongoing ping interval *immediately* and immediately start it again. */
    restartPingInterval() {
        this.stopPingImmediately();
        this.#startPingInterval();
    }
}
