type Effect = () => void;

type ReactiveStorage = {
    dependencies: Set<Effect>;
};

type SyncStorage = {
    effect: Effect;
    dependecies: Set<Effect>;
};

const __global__reactiveStorage = new WeakMap<any, ReactiveStorage>();
let __global__schedulerRunningEffect: Effect | null = null;
let __global__schedulerSyncStorage: SyncStorage | null = null;

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

function trackDependencies(target: object) {
    if (!__global__schedulerRunningEffect) {
        return;
    }

    const storage = __global__reactiveStorage.get(target);
    if (!storage) {
        throw new Error("REACTIVE -> Reactive object does not exist.");
    }

    storage.dependencies.add(__global__schedulerRunningEffect);
}

function triggerDependencies(target: object) {
    const storage = __global__reactiveStorage.get(target);
    if (!storage) {
        throw new Error("REACTIVE -> Reactive object does not exist.");
    }

    if (!__global__schedulerSyncStorage) {
        storage.dependencies.forEach((dep) => dep());
    } else {
        storage.dependencies.forEach((dep) =>
            __global__schedulerSyncStorage?.dependecies.add(dep),
        );
    }
}

function registerReactiveObject(target: object) {
    if (__global__reactiveStorage.has(target)) {
        throw new Error(
            "REACTIVE -> A reactive object cannot be registered again",
        );
    }

    __global__reactiveStorage.set(target, { dependencies: new Set() });
}

function reactiveValue<T>(value: T): { value: T } {
    const proxy = new Proxy(
        { value },
        {
            get(target, key, receiver) {
                if (key !== "value") {
                    throw new Error(
                        "REACTIVE -> A reactive object has to be accessed through the 'value' property.",
                    );
                }

                trackDependencies(proxy);

                return target.value;
            },
            set(target, key, newValue, reveiver) {
                if (key !== "value") {
                    throw new Error(
                        "REACTIVE -> A reactive object has to be accessed through the 'value' property.",
                    );
                }

                target.value = newValue;
                triggerDependencies(proxy);

                return true;
            },
        },
    );

    registerReactiveObject(proxy);
    return proxy;
}

function sync(effect: Effect) {
    if (__global__schedulerSyncStorage) {
        throw new Error("REACTIVE - Something went horribly wrong");
    }

    __global__schedulerSyncStorage = {
        effect: effect,
        dependecies: new Set(),
    };

    effect();
    __global__schedulerSyncStorage?.dependecies.forEach((dep) => dep());

    __global__schedulerSyncStorage = null;
}

function watch(effect: Effect) {
    if (__global__schedulerRunningEffect) {
        throw new Error("REACTIVE - Something went horribly wrong");
    }

    __global__schedulerRunningEffect = effect;
    sync(effect);
    __global__schedulerRunningEffect = null;
}

const count = reactiveValue(1);
const count2 = reactiveValue(2);

watch(() => {
    console.log({ count: count.value, count2: count2.value });
});

sync(() => {
    count.value += 1;
    count2.value += 1;
});
