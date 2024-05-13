import { SocketBase } from './SocketBase.js';

export interface ClientOptions {
  /**
   * @see {@link ClientSocketBase.pingInterval}
   * @default 0
   */
  pingInterval: number,
  /**
   * @see {@link ClientSocketBase.pingTimeout}
   * @default 3000
   */
  pingTimeout: number,
  /**
   * @see {@link ClientSocketBase.maxReconnectTimeoutDuration}
   * @default 10000
   */
  maxReconnectTimeoutDuration: number,
  /**
   * @see {@link ClientSocketBase.minReconnectTimeoutDuration}
   * @default 750
   */
  minReconnectTimeoutDuration: number,
}


export class ClientSocketBase extends SocketBase {
  #pingIntervalHasChanged = false;
  #pingIntervalID: number | null | undefined;
  // @ts-ignore Propagated by getter/setter
  #pingInterval: number;
  /**
   * Amount of time in milliseconds that is waited for a ping response.
   * If no response comes within this window, a `timeout` event will be invoked.
   */
  pingTimeout: number;

  #reconnectTimeoutID: number | null = null;
  #reconnectTimeoutDuration: number;

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
  socketURL: string;

  /**
   * Interval in milliseconds in which to send a ping.
   * Can be changed on the fly, in which case the interval becomes
   * active once the current ping has fired.
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

  constructor(url: string, {
    pingInterval = 0,
    pingTimeout = 3000,
    maxReconnectTimeoutDuration = 10000,
    minReconnectTimeoutDuration = 750,
  }) {
    super(null);
    this._socketClosed = this._socketClosed.bind(this);
    this._socketConnected = this._socketConnected.bind(this);
    this.sendPing = this.sendPing.bind(this);

    this.socketURL = url;
    this.pingTimeout = pingTimeout;
    this.pingInterval = pingInterval;
    this.maxReconnectTimeoutDuration = maxReconnectTimeoutDuration;
    this.minReconnectTimeoutDuration = minReconnectTimeoutDuration;
    this.#reconnectTimeoutDuration = minReconnectTimeoutDuration;

    this.addEventListener('open', this._socketConnected);
    this.addEventListener('close', this._socketClosed);
  }

  /** Socket pass-thru. Sends the specified message. */
  send(message: string | ArrayBufferLike | Blob | ArrayBufferView) {
    this.socket.send(message);
  }
  /**
   * Convenience method. Sends the specified data object with
   * the added field `evt` set to the specified event string.
   */
  sendEvent(eventType: string, data: Record<any, any> = {}) {
    data.evt = eventType;
    this.send(JSON.stringify(data));
  }
  sendPing() {
    super.sendPing();
    if (this.#pingIntervalHasChanged) {
      this.#restartPingInterval();
    }
    this._addPingTimeout(this.pingTimeout);
  }

  _handleReceivedPing() {
    super._handleReceivedPing();
    this._clearPingTimeout();
  }

  // ---- Connection handling ----
  initializeConnection() {
    this.socket = new WebSocket(this.socketURL);
    this._addEventsAgain();
  }

  _socketClosed(e: CloseEvent) {
    this.#trySocketReconnect();
    this.stopPingImmediately();
  }
  _socketConnected() {
    this.stopReconnectionAttempt();
    this.#startPingInterval();
    this.isTimedOut = false;
  }

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


  // ---- Helper functions ----
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

  #restartPingInterval() {
    this.stopPingImmediately();
    this.#startPingInterval();
  }
}
