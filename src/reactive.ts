type WatchHandler = () => void;

const __global__storage = new WeakMap<any, Set<WatchHandler>>();
let __global__schedulerCurrentHandler: WatchHandler | null = null;
let __global__schedulerSyncStorage: Set<WatchHandler> | null = null;

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
