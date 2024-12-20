import { SocketBase } from './SocketBase.js';
export interface ClientOptions {
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
 * Client implementation of the SocketBase, handling automatic
 * ramping-up reconnection attempts, among other things.
 * @see {@link SocketBase}
 */
export declare class ClientSocketBase extends SocketBase {
    #private;
    /**
     * Median interval of the received pings,
     * with a weight favoring the most recent pings.
     */
    medianPingInterval: number;
    /**
     * Maximum timeout between reconnection attempts in milliseconds.
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
    constructor(url: string, { maxReconnectTimeoutDuration, minReconnectTimeoutDuration, }?: ClientOptions);
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
