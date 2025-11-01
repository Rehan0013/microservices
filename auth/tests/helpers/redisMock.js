const store = new Map();

const redisMock = {
  _reset() {
    store.clear();
  },

  async get(key) {
    const val = store.get(key);
    return typeof val === 'undefined' ? null : val;
  },

  async set(key, value) {
    store.set(key, value);
    return 'OK';
  },

  async del(key) {
    return store.delete(key);
  },

  on() {
    // Mock Redis event handling
  }
};

module.exports = redisMock;
