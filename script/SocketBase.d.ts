/** Available custom events and their callbacks. */
export interface CustomEventMap {
    _timeout: () => any;
    _reconnect: () => any;
    _sentPing: () => any;
    _receivedPing: () => any;
}
export type AvailableEventMap = CustomEventMap & {
    [K in keyof WebSocketEventMap]: (this: WebSocket, ev: WebSocketEventMap[K]) => any;
};
/**
 * Base class that should be extended.
 * Features base functionality such as the event and ping handlers.
 */
export declare class SocketBase {
    #private;
    /** Object that is used in the ping payload. May not be changed. */
    static readonly pingPayload: ArrayBuffer;
    /** Denotes whether the socket is in a timed out state. */
    isTimedOut: boolean;
    socket: WebSocket | null;
    constructor(socket: WebSocket | null);
    /**
     * @internal
     * @param callback The original event callback that is called after the interception.
     * @param args Arguments that are passed on to the callback that
     *             has originally been defined in the message event.
     */
    _messageIntercept(callback: Function | null, e: MessageEvent, ...args: any[]): Promise<void>;
    /**
     * Called internally whenever no pong has been received
     * in the required time frame after a ping.
     */
    _missedPing(): void;
    /**
     * Called whenever a ping has been received.
     * Can be extended with additional functionality.
     */
    _handleReceivedPing(): void;
    /**
     * Handles reconnection operations in case the socket is timed out.
     * Is called whenever a message is received.
     */
    _handlePotentialReconnect(): void;
    /**
     * Clears a potential previous ping timeout and starts a new one.
     * A ping timeout is the time frame in which a pong must be received.
     *
     * Must be called externally or from a super class.
     */
    _addPingTimeout(duration: number): void;
    /**
     * Clears a potential previous ping timeout.
     * @see {@link _addPingTimeout}
     */
    _clearPingTimeout(): void;
    /**
     * Sends a ping.
     * A ping is always the same object defined in {@link pingPayload}.
     */
    sendPing(): void;
    /**
     * Add an event listener to the socket.
     * Accepts socket events (pass-thru) and custom events.
     * @see {@link CustomEventMap}
     */
    addEventListener<K extends keyof AvailableEventMap>(type: K, callback: AvailableEventMap[K]): void;
    removeEventListener<K extends keyof AvailableEventMap>(type: K, callback: AvailableEventMap[K]): void;
    _addEvent<K extends keyof AvailableEventMap>(type: K, callback: AvailableEventMap[K]): void;
    _removeEvent<K extends keyof AvailableEventMap>(type: K, callback: AvailableEventMap[K]): void;
    _addEventsAgain(): void;
    invokeEvent<K extends keyof AvailableEventMap>(type: K, ...args: Parameters<AvailableEventMap[K]>): void;
    removeAllEvents(): void;
}
