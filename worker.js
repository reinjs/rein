const is = require('is-type-of');
const Worker = require('./lib/worker');
const { EventEmitter } = require('async-events-listener');
const hasOwnProperty = Object.prototype.hasOwnProperty;

module.exports = class WorkerRuntime extends Worker {
  constructor(app) {
    super();
    this.$callbackId = 1;
    this.$callbacks = {};
    this.$app = app;
    this.$server = null;
    this.$inCluster = true;
    this.$events = new EventEmitter();
    this.context.send = this.send.bind(this);
    this.context.sendback = this.sendback.bind(this);
    this.context.error = this._app.error;
  }
  
  /**
   * receive a message
   * @param args
   * @returns {module.WorkerRuntime}
   */
  receive(...args) {
    this.$events.on(...args);
    return this;
  }
  
  /**
   * send a non-back message
   * @param args
   * @returns {module.WorkerRuntime}
   */
  send(...args) {
    this.$app.send(...args);
    return this;
  }
  
  /**
   * send a fallback message
   * @param to
   * @param event
   * @param data
   * @param timeout default: 3000
   * @returns {Promise<any>}
   */
  sendback(to, event, data, timeout) {
    return new Promise((resolve, reject) => {
      let timer = null;
      const time = Date.now();
      const id = this.$callbackId++;
      const receiver = (err, fallback) => {
        clearInterval(timer);
        delete this.$callbacks[id];
        if (err) return reject(new Error(err));
        resolve(fallback);
      };
      this.$callbacks[id] = receiver;
  
      /**
       * send data structure
       * action: <event>
       * body:
       *  __ipc_callback__: <id>
       *  data: <data>
       */
      this.send(to, event, {
        __ipc_callback__: id,
        data
      });
      timeout = timeout || this.config.agent_timeout || 3000;
      timer = setInterval(() => {
        if (Date.now() - time > timeout) {
          clearInterval(timer);
          delete this.$callbacks[id];
          reject(new Error(`timeout ${timeout}s: ${to}:${event}`));
        }
      }, 10);
    });
  }
  
  /**
   * receive message from upstream
   * @param msg
   * @returns {Promise<void>}
   */
  async message(msg) {
    if (msg.action === 'cluster:ready') return await this._app.invoke('ready');
    if (!isNaN(msg.action)) {
      if (this.$callbacks[msg.action]) await this.$callbacks[msg.action](msg.body.error, msg.body.data);
      return;
    }
    await this.$events.emit(msg.action, msg.body);
  }
  
  /**
   * how to create service?
   * @returns {Promise<void>}
   */
  async create() {
    this.config.cwd = this.$app._argv.cwd;
    this.config.service = this.$app._argv.service;
    if (this.$app._argv.agent && is.string(this.$app._argv.agent.extra)) {
      this.config.agent = {
        extra: JSON.parse(this.$app._argv.agent.extra)
      };
      this.config.agent.plugins = extraPlugins(this.config.agent.extra);
    }
    await this.initialize();
    this.$server = await this.listen();
  }
  
  /**
   * how to destroy service?
   * @param signal
   * @returns {Promise<void>}
   */
  async destroy(signal) {
    await this._app.invoke('beforeDestroy', signal);
    this.$server.close();
    await this._app.invoke('destroyed', signal);
  }
};

function extraPlugins(extra) {
  const res = {};
  for (const agent in extra) {
    if (hasOwnProperty.call(extra, agent)) {
      const plugins = extra[agent];
      if (is.array(plugins)) {
        plugins.forEach(plugin => {
          if (!res[plugin]) res[plugin] = [];
          const index = res[plugin].indexOf(agent);
          if (index === -1) res[plugin].push(agent);
        });
      }
    }
  }
  return res;
}