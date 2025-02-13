/** Available custom events and their callbacks. */
export interface CustomEventMap {
  _timeout: () => any,
  _reconnect: () => any,
  _sentPing: () => any,
  _receivedPing: () => any,
};
export type AvailableEventMap = CustomEventMap & {
  [ K in keyof WebSocketEventMap ]: (this: WebSocket, ev: WebSocketEventMap[K]) => any
};

type EventList = {
  [ K in keyof AvailableEventMap ]: Set<AvailableEventMap[K]>;
}

/**
 * Base class that should be extended.
 * Features base functionality such as the event and ping handlers.
 */
export class SocketBase {
  /** Object that is used in the ping payload. May not be changed. */
  static readonly pingPayload = Uint8Array.of(0).buffer;

  #awaitPingTimeoutID: number | null = null;
  #eventList: Partial<EventList> = {};

  /** Denotes whether the socket is in a timed out state. */
  isTimedOut = false;
  socket;

  constructor(socket: WebSocket | null) {
    this._messageIntercept = this._messageIntercept.bind(this);
    this._missedPing = this._missedPing.bind(this);

    this.socket = socket;
    // `_addEvent` must be used because otherwise `_message` would call itself again
    this._addEvent('message', this._messageIntercept.bind(this, null));
  }

  // ---- Ping handling ----
  /**
   * Method that intercepts each registered `message` event,
   * filters out a potential ping from the message payload,
   * and passes it on to the original callback.
   *
   * @internal
   * @private
   *
   * @param callback The original event callback that is called after the interception.
   * @param args Arguments that are passed on to the callback that
   *             has originally been defined in the message event.
   */
  async _messageIntercept(callback: Function | null, e: MessageEvent, ...args: any[]) {
    // The frontend receives data as a Blob, the backend as an ArrayBuffer.
    if (e.data instanceof Blob || e.data instanceof ArrayBuffer) {
      let pingDataArr;
      if (e.data instanceof Blob && e.data.size === 1) {
        pingDataArr = new Uint8Array(await e.data.arrayBuffer());
      } else if (e.data instanceof ArrayBuffer && e.data.byteLength === 1) {
        pingDataArr = new Uint8Array(e.data);
      }
      if (pingDataArr && pingDataArr[0] === 0) {
        // Using callback as simple flag that the event comes from the `SocketBase`
        // so that the ping handler is called only exactly once
        if (!callback) {
          this._handleReceivedPing();
        }
        return;
      }
    }
    this._handlePotentialReconnect();
    callback?.(e, ...args);
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
    this._handlePotentialReconnect();
  }

  /**
   * Handles reconnection operations in case the socket is timed out.
   * Is called whenever a message is received.
   */
  _handlePotentialReconnect() {
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
  _addPingTimeout(duration: number) {
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
  addEventListener<K extends keyof AvailableEventMap>(type: K, callback: AvailableEventMap[K]) {
    if (type === 'message') {
      // @ts-ignore
      callback = this._messageIntercept.bind(this, callback);
    }
    this._addEvent(type, callback);
  }
  removeEventListener<K extends keyof AvailableEventMap>(type: K, callback: AvailableEventMap[K]) {
    if (type === 'message') {
      // @ts-ignore
      callback = this._messageIntercept.bind(this, callback);
    }
    this._removeEvent(type, callback);
  }

  /**
   * @internal
   * @private
   */
  _addEvent<K extends keyof AvailableEventMap>(type: K, callback: AvailableEventMap[K]) {
    if (!type.startsWith('_')) {
      // @ts-ignore
      this.socket?.addEventListener(...arguments);
    }
    if (!(type in this.#eventList)) {
      // @ts-ignore ???
      this.#eventList[type] = new Set<AvailableEventMap[K]>();
    }
    // @ts-ignore ???
    this.#eventList[type].add(callback);
  }
  /**
   * @internal
   * @private
   */
  _removeEvent<K extends keyof AvailableEventMap>(type: K, callback: AvailableEventMap[K]) {
    if (!type.startsWith('_')) {
      // @ts-ignore
      this.socket?.removeEventListener(...arguments);
    }
    const callbacks = this.#eventList[type];
    callbacks?.delete(callback);
  }

  _addEventsAgain() {
    for (const [ type, callbacks ] of Object.entries(this.#eventList)) {
      if (!type.startsWith('_')) {
        callbacks.forEach(callback => {
          // @ts-ignore
          this.socket?.addEventListener(type, callback);
        });
      }
    }
  }

  invokeEvent<K extends keyof AvailableEventMap>(type: K, ...args: Parameters<AvailableEventMap[K]>) {
    if (type.startsWith('_')) {
      this.#eventList[type]?.forEach(callback => {
        // @ts-ignore
        callback(...args);
      });
    }
  }
  removeAllEvents() {
    for (const [ type, callbackList ] of Object.entries(this.#eventList)) {
      for (const callback of callbackList) {
        this.removeEventListener(type as keyof AvailableEventMap, callback);
      }
    }
  }
}
