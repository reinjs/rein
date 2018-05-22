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
  
  async _exec(action, data) {
    const re = /^(([^:]+):)?(.+)$/.exec(action);
    const name = re[2], event = re[3];
    if (!event) return;
    if (name && this.router && this.router[name] && this.router[name][event]) return await this.router[name][event](data);
    if (this.router && this.router.project && this.router.project[event]) return await this.router.project[event](data);
    return await this.emit(event, data);
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
      const res = await this._exec(msg.action, msg.body.data).catch(e => Promise.resolve(e));
      if (is.error(res)) {
        this.send(msg.from, id, { error: res.message });
        return;
      }
      this.send(msg.from, id, { data: res });
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
    this.send('workers', 'agent:plugins', {
      name: this.name,
      plugins: Object.keys(this.plugins)
    })
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