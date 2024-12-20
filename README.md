# SocketBase
Tiny and self-contained library that handles boilerplate
[WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
operations with ease.

Main features:
- Automatic ping & pong with configurable timings
- Event shimming & custom events for ping handling, timeout and reconnect
- (Client) Ramping-up reconnection attempts after a timeout


## Compatibility
**Important**: This library exclusively uses web technologies and thus assumes
the existence of a global `WebSocket` object by web standards. On the server
side, this makes it compatible with Deno (all versions) and NodeJS from version
22.0.0 onwards.

I have not yet tested NodeJS compatibility and I'd greatly appreciate feedback
in that regard!


## Installation
### Download
All required files are in the [`./script`](./script) directory.
You can choose to omit either the JS or TS versions depending on your needs
and can additionally fetch the `d.ts` files for type checking.

### Package manager
Available on npm under `@maluscat/socket-base`. Use your favorite package manager:
```sh
yarn add @maluscat/socket-base
bun install @maluscat/socket-base
npm install @maluscat/socket-base
```

### Git submodules
You can also use [Git submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules),
which is a powerful tool capable of replacing a package manager for simple projects.

Setup:
```sh
git submodule add https://gitlab.com/Maluscat/socket-handler.git
```

Install after cloning:
```sh
git submodule update --init
```

Update (this will fetch the latest commit of the `main` branch):
```sh
git submodule update --remote
```


## Usage
There are two main components to this library, both of which need to be used
since they communicate with each other: The `ClientSocketBase` for use by the
client and the `ServerSocketBase` for use by the server.

### Events
Events are the same for both classes. The methods `addEventListener(type, callback)`
and `removeEventListener(type, callback)` emit all of the `WebSocket`'s events
along with the custom events below.

These methods respect the fact that `sock` may be volatile (as it is in the
`ClientSocketBase`) and use an internal cache to keep track and re-apply
all events as needed!

Available custom events (no parameters are passed):
<dl>
<dt><code>_timeout</code></dt>
<dd>
A ping (client) or pong (server) has not been received in the required time
frame, thus marking the socket as timed out.
</dd>

<dt><code>_reconnect</code></dt>
<dd>
Any message, including a ping, has been received again after a period of
timeout, thus marking the socket as having reestablished its connection.
</dd>

<dt><code>_receivedPing</code></dt>
<dd>
A ping has been received.
</dd>

<dt><code>_sentPing</code></dt>
<dd>
A ping has been sent.
</dd>
</dl>


### `ClientSocketBase`
The capabilities of this class include receiving pings from the server and
immediately replying with a pong. Additionally, as soon as the socket closes
(for example due to a lost connection), a reconnection attempt is started using
the configurable min and max timings (see below).

**Important:** Keep in mind that ultimately, the browser will dictate the
connection timings. If the browser has been trying to reestablish a socket
connection to a URL for a long time, it might take several seconds for a connection
attempt to propagate!

#### Initialization
The constructor takes the WebSocket URL and configuration options (optional),
here with their default values:
```ts
const socket = new ClientSocketBase('https://example.com/socket', {
  /**
   * Denotes the ratio to the mean interval between two pings
   * in which a ping must be received before a timeout is assumed.
   *
   * The value is multiplied with the mean ping interval, so a value of 2
   * would mean that a ping must be received within double this interval.
   */
  pingWindowThreshold: 1.25;
  /**
   * Maximum timeout between reconnection attempts in milliseconds.
   *
   * Disables reconnection attempts when set to a negative number.
   */
  maxReconnectTimeoutDuration: 10000,
  /**
   * Minimum timeout between reconnection attempts in milliseconds.
   *
   * After each failed reconnection attempt, the effective timeout is
   * doubled, reaching a cap at the `maxReconnectTimeoutDuration`.
   */
  minReconnectTimeoutDuration: 750,
});
```
All options are present as class properties and can be changed anytime.

**Calling the constructor does not establish a WebSocket connection yet!**
In order to do this, you must manually call `initializeConnection()`.


#### Ping timeout
The time between recently received pings is weighted and stored in
`meanPingInterval`, which helps make the class independent of any constants
and smooth out network noise.
If a ping takes longer to be received than the ratio denoted by
`pingWindowThreshold` (see above) to this mean interval, a timeout is
assumed and a timeout event is dispatched.


#### Useful methods
See the [docs](https://docs.malus.zone/socket-base/#ClientSocketBase.ClientSocketBase).
The most useful methods are `send(message)` (alias to `sock.send(message)`)
and `initializeConnection()`.


### `ServerSocketBase`
This class is responsible for sending pings and reacting with a timeout once a
pong has not been received in the given threshold.


### Advanced usage
The underlying `SocketBase` can obviously be extended as well for more advanced
use cases! All methods and properties are sufficiently documented, so feel free
to have a look at the [docs](#docs)!


## Example
My project [Scratchet](https://gitlab.com/Maluscat/scratchet) utilizes this
library in the
[ScratchetSocketBase](https://gitlab.com/Maluscat/scratchet/-/blob/main/static/script/socket/ScratchetSocketBase.js)
by extending it. It mostly reacts to events to display user information.


## Docs
See the generated [docs](https://docs.malus.zone/socket-base/) for a more
in-depth overview of the library.


## License
Licensed under the ISC license.
