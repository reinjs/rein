const is = require('is-type-of');
const Agent = require('./lib/agent');

module.exports = class AgentRuntime extends Agent {
  constructor(app) {
    super();
    this.$app = app;
  }
  
  /**
   * send message
   * @param args
   * @returns {module.AgentRuntime}
   */
  send(...args) {
    this.$app.send(...args);
    return this;
  }
  
  /**
   * receive message from upstream
   * @param msg
   * @returns {Promise<void>}
   */
  async message(msg) {
    if (msg.action === 'cluster:ready') return await this._app.invoke('ready');
    if (msg.body && msg.body.__ipc_callback__) {
      const id = msg.body.__ipc_callback__;
      const res = await this.emit(msg.action, msg.body.data).catch(e => Promise.resolve(e));
      if (is.error(res)) {
        this.send(msg.from, id, { error: res.message });
        return;
      }
      this.send(msg.from, id, res);
      return;
    }
    await this.emit(msg.action, msg.body);
  }
  
  /**
   * how to create service?
   * @returns {Promise<void>}
   */
  async create() {
    this.config.cwd = this.$app._argv.cwd;
    this.config.service = this.$app._argv.service;
    await this.listen();
  }
  
  /**
   * how to destroy service?
   * @param signal
   * @returns {Promise<void>}
   */
  async destroy(signal) {
    await this._app.invoke('destroyed', signal);
  }
};