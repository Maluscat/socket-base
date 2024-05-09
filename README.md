# SocketHandler
Small, configurable and self-contained scripts for working with
[WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

Main features:
- Automatic ping & pong in a set interval
- (Client) Ramping-up reconnection attempts once timed out
- Event shimming & custom events (`_timeout`, `_reconnect`, `_sentPing`)

## Installation
### Download
Yes. Download the files in the [`./script`](./script) directory.
You can choose to omit either the JS or TS versions depending on your needs,
although having the latter might be useful for type checking.

### Package manager
This project isn't on any package manager. However, you can use your favorite
package manager's *Git resolution strategy*
([Yarn](https://yarnpkg.com/cli/add), [npm](https://docs.npmjs.com/cli/v6/commands/npm-install), you're welcome).

### Git submodules
You can also use [Git submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules),
which is a powerful tool capable of replacing a package manager for simple projects.
That way, you can pin this repo to a specific commit and only update it when you're ready.

Setup:
```sh
git submodule add https://gitlab.com/Maluscat/socket-handler.git
```

Update (this will fetch the latest commit of `main`):
```sh
git submodule update --remote
```

## Usage
TODO. For the time being, check out the source and
[ScratchetSocketBase](https://gitlab.com/Maluscat/scratchet/-/blob/main/static/script/socket/ScratchetSocketBase.js).
