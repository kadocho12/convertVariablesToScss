declare namespace globalThis {
  const console: Console;
  const fetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}