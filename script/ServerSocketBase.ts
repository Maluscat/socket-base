import { SocketBase } from './SocketBase.js';

export interface ServerOptions {
  /**
   * @see {@link ServerSocketBase.pingInterval}
   * @default 0
   */
  pingInterval?: number,
  /**
   * @see {@link ServerSocketBase.pingTimeout}
   * @default 3000
   */
  pingTimeout?: number,
}

/**
 * Server implementation of the SocketBase, handling received pings.
 *
 * The server is entirely independent of any set timing constants.
 * It calculates the average interval between each ping
 * (with a weight on the most recent ones) and sets its ping timeout
 * accordingly, thus naturally incorporating jitter and similar factors
 * into the equation.
 *
 * @see {@link SocketBase}
 */
export class ServerSocketBase extends SocketBase {
  #pingIntervalHasChanged = false;
  #pingIntervalID: number | null | undefined;
  // @ts-ignore Propagated by getter/setter
  #pingInterval: number;
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

  constructor(socket: WebSocket, {
    pingInterval = 0,
    pingTimeout = 3000,
  }: ServerOptions = {}) {
    super(socket);
    this._socketClosed = this._socketClosed.bind(this);
    this._socketConnected = this._socketConnected.bind(this);
    this.sendPing = this.sendPing.bind(this);
    
    this.pingTimeout = pingTimeout;
    this.pingInterval = pingInterval;

    this.addEventListener('open', this._socketConnected);
    this.addEventListener('close', this._socketClosed);
  }

  _socketClosed(e: CloseEvent) {
    this.stopPingImmediately();
  }
  _socketConnected() {
    this.#startPingInterval();
  }

  override _handleReceivedPing() {
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
  override sendPing() {
    super.sendPing();
    if (this.#pingIntervalHasChanged) {
      this.#restartPingInterval();
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

  #restartPingInterval() {
    this.stopPingImmediately();
    this.#startPingInterval();
  }
}
