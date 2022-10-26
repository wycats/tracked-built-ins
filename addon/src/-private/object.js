import {
  createStorage,
  getValue,
  setValue,
} from 'ember-tracked-storage-polyfill';

import { consumeTag, tagFor, dirtyTagFor } from '@glimmer/validator';

export default class TrackedObject {
  static fromEntries(entries) {
    return new TrackedObject(Object.fromEntries(entries));
  }

  constructor(obj = {}) {
    let proto = Object.getPrototypeOf(obj);
    let descs = Object.getOwnPropertyDescriptors(obj);

    let clone = Object.create(proto);

    for (let prop in descs) {
      Object.defineProperty(clone, prop, descs[prop]);
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let self = this;

    return new Proxy(clone, {
      get(target, prop) {
        self.#values.consume(prop);

        return target[prop];
      },

      has(target, prop) {
        self.#values.consume(prop);

        return prop in target;
      },

      ownKeys(target) {
        getValue(self.#iteration);

        return Reflect.ownKeys(target);
      },

      set(target, prop, value) {
        if (!(prop in target)) {
          self.#dirtyKeys();
        }

        target[prop] = value;

        self.#values.update(prop);

        return true;
      },

      deleteProperty(target, prop) {
        if (prop in target) {
          delete target[prop];
          self.#values.update(prop);
          self.#dirtyKeys();
        }

        return true;
      },

      getPrototypeOf() {
        return TrackedObject.prototype;
      },
    });
  }

  #iteration = createStorage(null, () => false);
  #values = new PropertyStorageMap(this);

  #readStorageFor(key) {
    consumeTag(tagFor(this, key));
  }

  #dirtyStorageFor(key) {
    dirtyTagFor(this, key);
  }

  #dirtyKeys() {
    setValue(this.#iteration, null);
  }
}

export class PropertyStorageMap {
  #object;

  constructor(object) {
    this.#object = object;
  }

  consume(key) {
    consumeTag(tagFor(this.#object, key));
  }

  update(key) {
    dirtyTagFor(this.#object, key);
  }
}
