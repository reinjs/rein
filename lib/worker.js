const Koa = require('koa');
const convert = require('koa-convert');
const compose = require('koa-compose');
const debug = require('debug')('koa:application');
const isGeneratorFunction = require('is-generator-function');
const deprecate = require('depd')('koa');
const Application = require('./application');
const is = require('is-type-of');
const Loader = require('../../rein-loader');
const Router = require('./router');

const originalPrototypes = {
  request: require('koa/lib/request'),
  response: require('koa/lib/response'),
  context: require('koa/lib/context'),
  application: require('koa/lib/application'),
};

module.exports = class Worker extends Koa {
  constructor(config = {}) {
    super();
    /**
     * in order to support app.middleware
     * we should change `this.middleware = []` to `this._middleware = []`
     * and redefine `this.middleware = {}`
     * @type {Array}
     * @private
     */
    this.config = config;
    this._middleware = [];
    this.middleware = {};
    this.plugins = {};
    this.pid = process.pid;
    this.env = process.env.NODE_ENV || 'dev';
    this._app = new Application(this);
    this.loader = new Loader();
    this.prepare(() => this.router = new Router(this.config.router || {}));
  }
  
  /**
   * @life analysis
   * @param fn
   * @returns {Promise<module.Application>}
   */
  analysis(fn) {
    return this._app.analysis(fn);
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
   * @life routing
   * @param fn
   * @returns {Promise<module.Application>}
   */
  routing(fn) {
    return this._app.routing(fn);
  }
  
  /**
   * @life beforeStart
   * @param fn
   * @returns {Promise<module.Application>}
   */
  beforeStart(fn) {
    return this._app.beforeStart(fn);
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
   * @life beforeDestroy
   * @param fn
   * @returns {Promise<module.Application>}
   */
  beforeDestroy(fn) {
    return this._app.beforeDestroy(fn);
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
   * name of worker
   * @returns {string}
   */
  get name() {
    return 'worker_' + this.pid;
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
   * override koa's `use` method for support `this._middleware`
   * Use the given middleware `fn`.
   * Old-style middleware will be converted.
   * @param {Function} fn
   * @returns {module.Worker}
   * @api public
   */
  use(fn) {
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');
    if (isGeneratorFunction(fn)) {
      deprecate('Support for generators will be removed in v3. ' +
        'See the documentation for examples of how to convert old middleware ' +
        'https://github.com/koajs/koa/blob/master/docs/migration.md');
      fn = convert(fn);
    }
    debug('use %s', fn._name || fn.name || '-');
    this._middleware.push(fn);
    return this;
  }
  
  /**
   * override koa's `callback` method for support `this._middleware`
   * Return a request handler callback
   * for node's native http server.
   * @returns {function(*=, *=): *}
   * @api public
   */
  callback() {
    const fn = compose(this._middleware);
    if (!this.listenerCount('error')) this.on('error', this.onerror);
    return (req, res) => {
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };
  }
  
  /**
   * override koa's `listen` method to asyncFunction
   * in order to run `await this._app.init()`
   *
   * Shorthand for:
   * `http.createServer(app.callback()).listen(...)`
   * @param {Mixed} ...args
   * @return {Server}
   * @api public
   */
  async listen(...args) {
    await this._app.initialize(false, originalPrototypes);
    await this._app.invoke('routing');
    this.use(this.router.routes());
    this.use(this.router.allowedMethods());
    await this._app.invoke('beforeStart');
    const server = await new Promise((resolve, reject) => {
      const lastArg = args.slice(-1)[0];
      const leftArg = args.slice(0, -1);
      const object = {};
      if (is.function(lastArg)) {
        object.callback = listenCallback(resolve, reject, object, lastArg);
        object.args = leftArg;
      } else {
        object.args = args;
        object.callback = listenCallback(resolve, reject, object);
      }
      object.args.push(object.callback);
      object.server = super.listen(...object.args);
    });
    this._app.close(async () => server.close());
    await this._app.invoke('started');
    this._app._installed = true;
    return server;
  }
};

function listenCallback(resolve, reject, object, callback) {
  return function ServiceListenCallback(err) {
    if (err) return reject(err);
    if (callback) callback(err);
    resolve(object.server);
  }
}