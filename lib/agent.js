const is = require('is-type-of');
const Application = require('./application');
module.exports = class Agent {
  constructor(config = {}) {
    /**
     * in order to support app.middleware
     * we should change `this.middleware = []` to `this._middleware = []`
     * and redefine `this.middleware = {}`
     * @type {Array}
     * @private
     */
    this.config = config;
    this.pid = process.pid;
    this.env = process.env.NODE_ENV || 'dev';
    this._app = new Application(this);
    this._listeners = {};
  }
  
  /**
   * emit an event
   * @param event
   * @param data
   * @returns {Promise<void>}
   */
  async emit(event, data) {
    if (is.function(this._listeners[event])) {
      return await this._listeners[event](data);
    }
  }
  
  /**
   * receive an event
   * @param event
   * @param callback
   * @returns {module.Agent}
   */
  receive(event, callback) {
    if (this._listeners[event]) this.logger.warn(`event[${event}] is exists, now override it.`);
    this._listeners[event] = callback;
    return this;
  }
  
  /**
   * @life prepare
   * @param fn
   * @returns {Promise<module.Application>}
   */
  prepare(fn) {
    return this._app.prepare(fn);
  }
  
  /**
   * @life started
   * @param fn
   * @returns {Promise<module.Application>}
   */
  started(fn) {
    return this._app.started(fn);
  }
  
  /**
   * @life ready
   * @param fn
   * @returns {Promise<module.Application>}
   */
  ready(fn) {
    return this._app.ready(fn);
  }
  
  /**
   * @life destroyed
   * @param fn
   * @returns {Promise<module.Application>}
   */
  destroyed(fn) {
    return this._app.destroyed(fn);
  }
  
  /**
   * name of agent
   * @returns {string}
   */
  get name() {
    return this.$app.name;
  }
  
  /**
   * framework loader
   * @returns {Loader}
   */
  get loader() {
    return this._app.loader;
  }
  
  /**
   * plugin list
   * @returns {{}}
   */
  get plugins() {
    return this._app.plugins;
  }
  
  /**
   * get logger from application
   * alias logger on koa
   * you can use `app.logger[type]` instead of `app._app.logger`
   * @returns {Console | *}
   */
  get logger() {
    return this._app.logger;
  }
  
  /**
   * reset logger into application
   * @param logger
   */
  set logger(logger) {
    this._app.logger = logger;
  }
  
  /**
   * override koa's `listen` method to asyncFunction
   * in order to run `await this._app.initialize()`
   *
   * Shorthand for:
   * `http.createServer(app.callback()).listen(...)`
   *
   * @return {Server}
   * @api public
   */
  async listen() {
    await this._app.initialize(['message'], true);
    await this._app.invoke('started');
  }
};