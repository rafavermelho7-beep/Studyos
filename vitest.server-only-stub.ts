// Vitest runs service code outside Next's bundler, which is what normally
// makes the real "server-only" package a no-op in a server bundle (Next
// aliases it there; the package itself always throws). Alias it here to
// this empty stub so `import "server-only"` is harmless under Vitest too.
export {};
