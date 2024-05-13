import { SocketBase } from './SocketBase.js';

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
  /** Counts the first two pings to coordinate the timings setup. */
  #pingSetup = 0;
  /** Timestamp of the last received ping. Used for calculating the timings. */
  #lastPingTimestamp = 0;
  /**
   * Median interval of the received pings,
   * with a weight favoring the most recent pings.
   */
  medianPingInterval = 0;

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
