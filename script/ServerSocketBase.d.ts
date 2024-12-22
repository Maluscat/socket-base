import { SocketBase } from './SocketBase.js';
export interface ServerOptions {
    /**
     * @see {@link ServerSocketBase.pingInterval}
     * @default 0
     */
    pingInterval?: number;
    /**
     * @see {@link ServerSocketBase.pingTimeout}
     * @default 3000
     */
    pingTimeout?: number;
}
/**
 * Server implementation of the SocketBase.
 *
 * This class is responsible for sending pings and reacting with a
 * timeout once a pong has not been received in the given threshold.
 *
 * @see {@link SocketBase}
 */
export declare class ServerSocketBase extends SocketBase {
    #private;
    /**
     * Amount of time in milliseconds that is waited for a ping response.
     * If no response comes within this window, a `timeout` event will be
     * invoked and a reconnection attempt is started.
     */
    pingTimeout: number;
    /**
     * Interval in milliseconds in which to send a ping.
     * Can be changed on the fly, in which case the interval becomes
     * active once the currently awaited ping has fired.
     *
     * Set to 0 to disable.
     * @default 0
     * @type { number }
     */
    get pingInterval(): number;
    set pingInterval(val: number);
    constructor(socket: WebSocket, { pingInterval, pingTimeout, }?: ServerOptions);
    _socketClosed(e: CloseEvent): void;
    _socketConnected(): void;
    _handleReceivedPing(): void;
    /**
     * Sends a ping as per the corresponding super method and
     * activates a timeout that will send a `_timeout` event
     * when no pong has been received in time.
     *
     * @see {@link SocketBase.sendPing}
     */
    sendPing(): void;
    /**
     * Stop an ongoing ping interval immediately, without
     * waiting for the current interval to finish.
     */
    stopPingImmediately(): void;
    /** Stop an ongoing ping interval *immediately* and immediately start it again. */
    restartPingInterval(): void;
}
