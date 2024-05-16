import { SocketBase } from './SocketBase.js';

export interface ClientOptions {
  /**
   * @see {@link ClientSocketBase.maxReconnectTimeoutDuration}
   * @default 10000
   */
  maxReconnectTimeoutDuration?: number,
  /**
   * @see {@link ClientSocketBase.minReconnectTimeoutDuration}
   * @default 750
   */
  minReconnectTimeoutDuration?: number,
}


/**
 * Client implementation of the SocketBase, handling automatic
 * ramping-up reconnection attempts, among other things.
 * @see {@link SocketBase}
 */
export class ClientSocketBase extends SocketBase {
  #reconnectTimeoutID: number | null = null;
  #reconnectTimeoutDuration: number;

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

  constructor(url: string, {
    maxReconnectTimeoutDuration = 10000,
    minReconnectTimeoutDuration = 750,
  }: ClientOptions = {}) {
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
  send(message: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (!this.socket) {
      throw new Error("ClientSocketBase @ send: No socket defined. Initialize a new socket first.");
    } else {
      this.socket.send(message);
    }
  }
  /**
   * Convenience method. Sends the specified data object with
   * the added field `evt` set to the specified event string.
   */
  sendEvent(eventType: string, data: Record<any, any> = {}) {
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

  _socketClosed(e: CloseEvent) {
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
    this.#reconnectTimeoutID = setTimeout(() => {
      this.initializeConnection();
      this.#reconnectTimeoutDuration =
        Math.min(this.maxReconnectTimeoutDuration, this.#reconnectTimeoutDuration * 2);
    }, this.#reconnectTimeoutDuration);
  }

  // ---- Ping handling ----
  _handleReceivedPing() {
    const currentTime = new Date().getTime();

    if (this.isTimedOut) {
      this.#resetTimings();
    } else {
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
  #setTimings(timeElapsed: number) {
    if (this.#pingSetup <= 1) {
      if (this.#pingSetup === 1) {
        this.medianPingInterval = timeElapsed;
      }
      this.#pingSetup++;
    } else {
      this.medianPingInterval = (this.medianPingInterval * 4 + timeElapsed * 1) / 5;
      this._addPingTimeout(this.medianPingInterval * 1.2);
    }
  }

  #resetTimings() {
    this.#pingSetup = 0;
  }
}
