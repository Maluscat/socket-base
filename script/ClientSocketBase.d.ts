import { SocketBase } from './SocketBase.js';
export interface ClientOptions {
    /**
     * @see {@link ClientSocketBase.pingWindowThreshold}
     * @default 1.25
     */
    pingWindowThreshold?: number;
    /**
     * @see {@link ClientSocketBase.maxReconnectTimeoutDuration}
     * @default 10000
     */
    maxReconnectTimeoutDuration?: number;
    /**
     * @see {@link ClientSocketBase.minReconnectTimeoutDuration}
     * @default 750
     */
    minReconnectTimeoutDuration?: number;
}
/**
 * Client implementation of the SocketBase.
 *
 * The capabilities of this class include receiving pings from the server and
 * immediately replying with a pong. Additionally, as soon as the socket closes
 * (for example due to a lost connection), a reconnection attempt is started
 * using the configurable min and max timings (see below).
 */
export declare class ClientSocketBase extends SocketBase {
    #private;
    /**
     * Mean interval of the received pings,
     * with a weight favoring the most recent pings.
     */
    meanPingInterval: number;
    /**
     * Denotes the ratio to the {@link meanPingInterval}
     * (so the mean interval between two pings) in which a ping
     * must be received before a timeout is assumed.
     *
     * @example
     * The value is multiplied with {@link meanPingInterval}, so a value of 2 would
     * mean that a ping must be received within double the mean ping interval.
     */
    pingWindowThreshold: number;
    /**
     * Maximum timeout between reconnection attempts in milliseconds.
     *
     * Setting this to a negative value disables all reconnection attempts.
     *
     * @see {@link minReconnectTimeoutDuration}
     */
    maxReconnectTimeoutDuration: number;
    /**
     * Minimum timeout between reconnection attempts in milliseconds.
     *
     * After each failed reconnection attempt, the effective timeout is
     * doubled, reaching a cap at {@link maxReconnectTimeoutDuration}.
     */
    minReconnectTimeoutDuration: number;
    /** Used socket URL. Changing it will only be reflected after a reconnect. */
    socketURL: string;
    constructor(url: string, { pingWindowThreshold, maxReconnectTimeoutDuration, minReconnectTimeoutDuration, }?: ClientOptions);
    /** Socket pass-thru. Sends the specified message. */
    send(message: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    /**
     * Convenience method. Sends the stringified specified data object
     * with the added field `evt` set to the specified event string.
     */
    sendEvent(eventType: string, data?: Record<any, any>): void;
    /**
     * Initialize a new connection, overwriting the current {@link socket}.
     * Does not close or cancel any currently existing socket connnection.
     */
    initializeConnection(): void;
    _socketClosed(e: CloseEvent): void;
    _socketConnected(): void;
    /** Stop trying to reconnect immediately. */
    stopReconnectionAttempt(): void;
    _handleReceivedPing(): void;
}
