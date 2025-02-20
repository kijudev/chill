type WatchHandler = () => void;

const __global__storage = new WeakMap<any, Set<WatchHandler>>();
let __global__schedulerCurrentHandler: WatchHandler | null = null;
let __global__schedulerSyncStorage: Set<WatchHandler> | null = null;

function isObject(value: unknown): boolean {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof RegExp) &&
        !(value instanceof Date) &&
        !(value instanceof Set) &&
        !(value instanceof Map)
    );
}

function reactiveValue<T>(value: T): { value: T } {
    const obj = new Proxy(
        { value },
        {
            get(target, key) {
                if (key !== "value") {
                    return undefined;
                }

                if (__global__schedulerCurrentHandler) {
                    __global__storage
                        .get(obj)
                        ?.add(__global__schedulerCurrentHandler);
                }

                return target.value;
            },
            set(target, key, newValue) {
                if (key !== "value") {
                    return false;
                }

                target.value = newValue;

                if (__global__schedulerSyncStorage) {
                    __global__storage
                        .get(obj)
                        ?.forEach((handler) =>
                            __global__schedulerSyncStorage?.add(handler),
                        );

                    return true;
                }

                __global__storage.get(obj)?.forEach((handler) => {
                    handler();
                });

                return true;
            },
        },
    );

    __global__storage.set(obj, new Set());

    return obj;
}

function reactiveObjectRaw<T extends object>(value: T, ctx?: Set<object>): T {
    const proxy = new Proxy(value, {
        get(target, key) {
            if (!(key in target)) {
                return undefined;
            }

            if (__global__schedulerCurrentHandler) {
                __global__storage
                    .get(proxy)
                    ?.add(__global__schedulerCurrentHandler);
            }

            return target[key];
        },
        set(target, key, newValue) {
            if (!(key in target)) {
                return false;
            }

            target[key] = newValue;

            let handlers = new Set<WatchHandler>();
            __global__storage.get(proxy)?.forEach((handler) => {
                handlers.add(handler);
            });

            if (ctx) {
                ctx.forEach((obj) => {
                    __global__storage.get(obj)?.forEach((handler) => {
                        handlers.add(handler);
                    });
                });
            }

            if (__global__schedulerSyncStorage) {
                handlers.forEach((handler) =>
                    __global__schedulerSyncStorage?.add(handler),
                );

                return true;
            }

            handlers.forEach((handler) => {
                handler();
            });

            return true;
        },
    });

    __global__storage.set(proxy, new Set());

    for (const [k, v] of Object.entries(value)) {
        if (isObject(v)) {
            proxy[k] = reactiveObjectRaw(v, new Set([proxy, ...(ctx ?? [])]));
        }
    }

    return proxy;
}

function reactiveObject<T extends object>(value: T): { value: T } {
    return reactiveObjectRaw({ value });
}

function sync(update: () => void) {
    __global__schedulerSyncStorage = new Set();

    update();
    for (const handler of __global__schedulerSyncStorage) {
        handler();
    }

    __global__schedulerSyncStorage = null;
}

function watch(handler: WatchHandler) {
    __global__schedulerCurrentHandler = handler;
    sync(handler);
    __global__schedulerCurrentHandler = null;
}

const counta = reactiveValue(0);
const countb = reactiveValue(0);

watch(() => {
    console.log({ a: counta.value, b: countb.value });
});

sync(() => {
    counta.value += 1;
    countb.value += 1;
});

const obj = reactiveObject({ a: { b: { c: 2 } } });

watch(() => {
    console.log({ obj: obj.value.a });
});
