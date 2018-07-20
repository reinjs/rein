const Router = require('koa-router');
const is = require('is-type-of');
const utils = require('@reinjs/rein-utils');
const extraRegexp = /^([^:\.\/]+):(.+)$/;

module.exports = class KoaRouter extends Router {
  constructor(app, ...args) {
    super(...args);
    this.app = app;
    
    // extra data saved by plugin invoking.
    this.extra = {};
  }
  
  /**
   * formatter for string middleware
   * 'a.b.c.d' -> app.middleware(controller).a.b.c.d
   * @param object
   * @param arg
   * @returns {T}
   */
  functional(object, arg) {
    return arg.split('.').reduce((target, property) => {
      if (target[property]) return target[property];
      throw new Error('[koa-router transfer] can not find property of ' + property);
    }, object);
  }
  
  /**
   * stringify middleware support:
   *  1. node_modules
   *  2. stringify
   *
   * @notice:
   *  in node_module modal
   *  if config[arg] is not exists then we know it with no params middleware
   *  either which has params middleware
   * @param arg
   * @returns {*}
   */
  middlewareTransfer(arg) {
    if (is.string(arg)) {
      if (this.app.middlewareScopes[arg]) {
        const exports = utils.loadFile(arg);
        if (is.function(exports)) {
          const options = this.app.config[arg];
          if (options === undefined) return exports;
          if (is.array(options)) {
            return exports(...options);
          } else {
            return exports(options);
          }
        }
      }
      return this.functional(this.app.middleware, arg);
    }
    return arg;
  }
  
  /**
   * stringify controller support
   * @param arg
   * @returns {*}
   */
  controllerTransfer(arg) {
    if (is.string(arg)) return this.functional(this.app.controller, arg);
    return arg;
  }
  
  /**
   * collect extra data
   * @param arg
   * @param rule
   * @param method
   * @returns {function(*, *): *}
   */
  extraTransfer(arg, rule, method) {
    const re = extraRegexp.exec(arg);
    if (!this.extra[re[1]]) this.extra[re[1]] = {};
    if (!this.extra[re[1]][rule]) this.extra[re[1]][rule] = [];
    this.extra[re[1]][rule].push({
      method,
      path: re[2]
    });
  }
  
  /**
   * router.use transfer
   * @param args
   * @returns {*}
   */
  use(...args) {
    return super.use(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      return this.middlewareTransfer(arg);
    }));
  }
  
  /**
   * router.param transfer
   * @param args
   * @returns {*}
   */
  param(...args) {
    return super.param(...args.map((arg, index) => {
      if (index === 0) return arg;
      return this.middlewareTransfer(arg);
    }));
  }
  
  /**
   * router.get transfer
   * @param args
   * @returns {*}
   */
  get(...args) {
    const length = args.length;
    return super.get(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      if (isExtra(arg, index, length)) return this.extraTransfer(arg, args[0], 'GET');
      if (index === length - 1) return this.controllerTransfer(arg);
      return this.middlewareTransfer(arg);
    }).filter(filter));
  }
  
  /**
   * router.put transfer
   * @param args
   * @returns {*|IDBRequest|Promise<void>}
   */
  put(...args) {
    const length = args.length;
    return super.put(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      if (isExtra(arg, index, length)) return this.extraTransfer(arg, args[0], 'PUT');
      if (index === length - 1) return this.controllerTransfer(arg);
      return this.middlewareTransfer(arg);
    }).filter(filter));
  }
  
  /**
   * router.post transfer
   * @param args
   * @returns {*}
   */
  post(...args) {
    const length = args.length;
    return super.post(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      if (isExtra(arg, index, length)) return this.extraTransfer(arg, args[0], 'POST');
      if (index === length - 1) return this.controllerTransfer(arg);
      return this.middlewareTransfer(arg);
    }).filter(filter));
  }
  
  /**
   * router.patch transfer
   * @param args
   * @returns {*}
   */
  patch(...args) {
    const length = args.length;
    return super.patch(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      if (isExtra(arg, index, length)) return this.extraTransfer(arg, args[0], 'PATCH');
      if (index === length - 1) return this.controllerTransfer(arg);
      return this.middlewareTransfer(arg);
    }).filter(filter));
  }
  
  /**
   * router.delete transfer
   * @param args
   * @returns {*}
   */
  delete(...args) {
    const length = args.length;
    return super.delete(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      if (isExtra(arg, index, length)) return this.extraTransfer(arg, args[0], 'DELETE');
      if (index === length - 1) return this.controllerTransfer(arg);
      return this.middlewareTransfer(arg);
    }).filter(filter));
  }
  
  /**
   * router.del transfer
   * @param args
   * @returns {*}
   */
  del(...args) {
    const length = args.length;
    return super.del(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      if (isExtra(arg, index, length)) return this.extraTransfer(arg, args[0], 'DELETE');
      if (index === length - 1) return this.controllerTransfer(arg);
      return this.middlewareTransfer(arg);
    }).filter(filter));
  }
  
  /**
   * router.head transfer
   * @param args
   * @returns {*}
   */
  head(...args) {
    const length = args.length;
    return super.head(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      if (isExtra(arg, index, length)) return this.extraTransfer(arg, args[0], 'HEAD');
      if (index === length - 1) return this.controllerTransfer(arg);
      return this.middlewareTransfer(arg);
    }).filter(filter));
  }
  
  /**
   * router.all transfer
   * @param args
   * @returns {*}
   */
  all(...args) {
    const length = args.length;
    return super.all(...args.map((arg, index) => {
      if (index === 0 && isRule(arg)) return arg;
      if (isExtra(arg, index, length)) return this.extraTransfer(arg, args[0], 'ALL');
      if (index === length - 1) return this.controllerTransfer(arg);
      return this.middlewareTransfer(arg);
    }).filter(filter));
  }
};

function isRule(arg) {
  return (is.string(arg) && (arg[0] === '/' || arg === '*')) || arg instanceof RegExp;
}

/**
 * match extra rule
 * {scope}:{path}
 * swagger:a.b.c
 * @param arg
 * @param index
 * @param length
 * @returns {boolean}
 */
function isExtra(arg, index, length) {
  return index < length - 1 && extraRegexp.test(arg);
}

/**
 * filter empty fns
 * @param fn
 * @param index
 * @returns {*}
 */
function filter(fn, index) {
  if (index === 0) return fn;
  return is.function(fn);
}