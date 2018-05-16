const fs = require('fs');
const path = require('path');
const is = require('is-type-of');
const pkg = require('../package.json');
const utils = require('@reinjs/rein-utils');
const Loader = require('@reinjs/rein-loader');

/**
 * plugin constructor
 * store something for invoking
 */
class pluginStructure {
  constructor(app, plugin, pluginConfig) {
    this.app = app.app;
    this.name = plugin.name;
    this.dir = plugin.dir;
    this.config = pluginConfig[plugin.name] || {};
    plugin.dependencies.forEach(dep => {
      if (this[dep] !== undefined) {
        throw new Error(`you can not set ${dep} dependency on plugin constructor, because it is exists.`);
      }
      Object.defineProperty(this, dep, {
        get() {
          return app.plugins[dep];
        }
      })
    })
  }
}

/**
 * common Application Runtime class
 * each for worker and agent
 * @type {module.Application}
 */
module.exports = class Application {
  constructor(app) {
    this.logger = console;
    this.app = app;
    this._lifeCycle = {};
    this._installed = false;
    this._closing = false;
    this.plugins = {};
    this.loader = new Loader();
  }
  
  /**
   * invoke lifecycle handle
   * @param name
   * @param args
   * @returns {Promise<void>}
   */
  async invoke(name, ...args) {
    const events = this._lifeCycle[name];
    if (events && events.length) {
      for (let i = 0, j = events.length; i < j; i++) {
        if (is.function(events[i])) {
          await events[i](...args);
        }
      }
    }
  }
  
  /**
   * push lifecycle into array
   * @param name
   * @param callback
   * @returns {Promise<module.Application>}
   * @private
   */
  async _pushLifeCycle(name, callback) {
    if (!this._lifeCycle[name]) this._lifeCycle[name] = [];
    this._lifeCycle[name].push(callback);
    return this;
  }
  
  /**
   * @life prepare
   * @param fn
   * @returns {Promise<module.Application>}
   */
  prepare(fn) {
    return this._pushLifeCycle('prepare', fn);
  }
  
  /**
   * @life routing
   * @param fn
   * @returns {Promise<module.Application>}
   */
  routing(fn) {
    return this._pushLifeCycle('routing', fn);
  }
  
  /**
   * @life beforeStart
   * @param fn
   * @returns {Promise<module.Application>}
   */
  beforeStart(fn) {
    return this._pushLifeCycle('beforeStart', fn);
  }
  
  /**
   * @life started
   * @param fn
   * @returns {Promise<module.Application>}
   */
  started(fn) {
    return this._pushLifeCycle('started', fn);
  }
  
  /**
   * @life ready
   * @param fn
   * @returns {Promise<module.Application>}
   */
  ready(fn) {
    return this._pushLifeCycle('ready', fn);
  }
  
  /**
   * @life beforeDestroy
   * @param fn
   * @returns {Promise<module.Application>}
   */
  beforeDestroy(fn) {
    return this._pushLifeCycle('beforeDestroy', fn);
  }
  
  /**
   * @life destroyed
   * @param fn
   * @returns {Promise<module.Application>}
   */
  destroyed(fn) {
    return this._pushLifeCycle('destroyed', fn);
  }
  
  extendCondition(target, scope, file) {
    return {
      target,
      inject: this.app,
      override: false,
      originalPrototypes: this.originalPrototypes,
      file: this.makePathname(scope, file)
    }
  }
  
  makePathname(scope, dir) {
    const isAgent = this.isAgent;
    return ({ type, pathname }) => {
      if (type === 'project') return path.resolve(pathname, scope, dir);
      if (isAgent) return path.resolve(pathname, 'agent', dir);
      return path.resolve(pathname, 'app', dir);
    }
  }
  
  /**
   * Analysis this.config
   * return something for using.
   * @returns {Promise<{plugins: *, runtimeFile: void | Promise<void> | Promise<any>, config: *, pluginConfig: *}>}
   */
  async analysisOptions() {
    const config = this.app.config;
    const env = this.app.env;
    const appConfig = {};
    const isAgent = this.isAgent;

    if (!config.cwd) config.cwd = process.cwd();
    if (!config.loader) config.loader = {};
    
    const pluginFile = path.resolve(config.cwd, `config/plugin.js`);
    const configEnvFile = path.resolve(config.cwd, `config/config.${env}.js`);
    const pluginEnvFile = path.resolve(config.cwd, `config/plugin.${env}.js`);
    const runtimeFile = path.resolve(config.cwd, this.isAgent ? this.app.name + '.js' : 'app.js');
    const projectPkgFile = path.resolve(config.cwd, `package.json`);
    
    appConfig.plugin = fs.existsSync(pluginFile) ? utils.loadFile(pluginFile) : {};
    appConfig.pluginConfig = fs.existsSync(pluginEnvFile) ? utils.loadFile(pluginEnvFile) : {};
    appConfig.configEnvFile = fs.existsSync(configEnvFile) ? utils.loadFile(configEnvFile) : {};
    
    if (is.function(appConfig.plugin)) appConfig.plugin = await appConfig.plugin(this.app);
    if (is.function(appConfig.pluginConfig)) appConfig.pluginConfig = await appConfig.pluginConfig(this.app);
    if (is.function(appConfig.configEnvFile)) appConfig.configEnvFile = await appConfig.configEnvFile(this.app);
    
    const projectPkg = fs.existsSync(projectPkgFile) ? utils.loadFile(projectPkgFile) : {};
    this.app.middlewareScopes = projectPkg.dependencies || {};
    
    const plugins = utils.analysisPlugins(appConfig.plugin, {
      env, isAgent,
      cwd: this.app.config.cwd,
      agent: this.app.name,
      framework: pkg.name,
      base: path.dirname(pluginFile)
    });
    
    return {
      plugins, runtimeFile,
      config: Object.assign({}, appConfig.configEnvFile, config),
      pluginConfig: appConfig.pluginConfig
    };
  }
  
  /**
   * setup initializer for application
   * @param isAgent
   * @param originalPrototypes
   * @returns {Promise<void>}
   */
  async initialize(widgets, isAgent, originalPrototypes) {
    this.originalPrototypes = originalPrototypes;
    this.isAgent = isAgent;
    
    const { config, plugins, pluginConfig, runtimeFile } = await this.analysisOptions();
    const { cwd, loader } = this.app.config = config;
    const scope = isAgent ? this.app.name : 'app';
  
    /**
     * make sure project app.js or {agent}.js is exists
     * then run it first time
     */
    if (fs.existsSync(runtimeFile)) {
      const runtimeExports = utils.loadFile(runtimeFile);
      if (is.function(runtimeExports)) {
        await runtimeExports(this.app);
      }
    }
    
    await this.invoke('prepare');
  
    /**
     * add system loaders
     * or in plugin, you can add your own compilers.
     */
    widgets.forEach(widget => {
      switch (widget) {
        case 'controller':
          this.loader.addControllerCompiler(Object.assign(
            loader.controller || {},
            {
              inject: this.app,
              target: this.app.controller = {},
              pathname: this.makePathname(scope, 'controller')
            }
          ));
          break;
        case 'middleware':
          this.loader.addMiddlewareCompiler(Object.assign(
            loader.middleware || {},
            {
              inject: this.app,
              target: this.app.middleware = {},
              pathname: this.makePathname(scope, 'middleware')
            }
          ));
          break;
        case 'service':
          this.loader.addServiceCompiler(Object.assign(
            loader.service || {},
            {
              inject: this.app,
              target: this.app.service = {},
              pathname: this.makePathname(scope, 'service')
            }
          ));
          break;
        case 'message':
          this.loader.addMessageCompiler(this.app, ({ type, pathname }) => {
            if (type === 'project') return path.resolve(pathname, `app/${this.app.name}.js`);
            return path.resolve(pathname, 'app/message.js');
          });
          break;
      }
    });
    
    if (this.originalPrototypes) {
      this.loader
        .addContextCompiler(this.extendCondition(this.app.context, scope, 'extend/context.js'))
        .addRequestCompiler(this.extendCondition(this.app.request, scope, 'extend/request.js'))
        .addResponseCompiler(this.extendCondition(this.app.response, scope, 'extend/response.js'))
        .addApplicationCompiler(this.extendCondition(this.app, scope, 'extend/application.js'));
    }
  
    this.loader.addProgram('project:/' + cwd);

    for (let i = 0, j = plugins.length; i < j; i++) {
      const plugin = plugins[i];
      // make a single object for each plugin
      const pluginInvoker = new pluginStructure(this, plugin, pluginConfig);
      // push to .plugins
      this.plugins[plugin.name] = pluginInvoker;
      if (is.function(plugin.exports)) {
        /**
         * invoke plugin's app.js or {agent}.js
         * for initializer
         */
        await plugin.exports(this.app, pluginInvoker);
        
        // add plugin scope dir on loader
        // then system will run it together
        this.loader.addProgram(plugin.name + ':/' + plugin.dir);
      }
    }
  
    if (this.app.router) {
      // add router compiler
      // if you want to change router
      // you should invoke routing lifecycle
      // then add .routes() and .allowedMethods() methods.
      this.loader.addRouterCompiler(this.app, this.makePathname(scope, 'router.js'));
    }
    
    // compile all compilers.
    this.loader.compile();
  }
  
  /**
   * kill the process by interval
   * @param callback
   * @param signal
   */
  kill(callback, signal = 'SIGINT') {
    if (this._closing) return;
    this._closing = true;
    let done = 0;
    
    this.invoke('beforeDestroy', signal)
      .then(() => callback())
      .then(() => this.invoke('destroyed', signal))
      .then(() => done = 1)
      .catch(e => {
        this.logger.error(e);
        done = -1;
        return Promise.resolve();
      });
    
    const timer = setInterval(() => {
      switch (done) {
        case -1:
          clearInterval(timer);
          return process.exit(1);
        case 1:
          clearInterval(timer);
          return process.exit(0);
      }
    }, 5);
  }
  
  /**
   * close process action
   * only for cluster processes
   * @param callback
   */
  close(callback) {
    if (!this.app.$inCluster) {
      process.on('SIGTERM', this.kill.bind(this, callback, 'SIGTERM'));
      process.on('SIGINT', this.kill.bind(this, callback, 'SIGINT'));
      process.on('SIGQUIT', this.kill.bind(this, callback, 'SIGQUIT'));
      ['error', 'rejectionHandled', 'uncaughtException', 'unhandledRejection'].forEach(errtype => {
        process.on(errtype, e => {
          if (this.logger) this.logger.error(`[worker:error#${errtype}]`, e);
          if (!this._installed) this.kill(callback);
        });
      });
    }
  }
};