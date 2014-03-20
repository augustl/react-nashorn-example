!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.when=e():"undefined"!=typeof global?global.when=e():"undefined"!=typeof self&&(self.when=e())}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var when = module.exports = require('../when');

when.callbacks = require('../callbacks');
when.cancelable = require('../cancelable');
when.delay = require('../delay');
when.fn = require('../function');
when.guard = require('../guard');
when.keys = require('../keys');
when.nodefn = when.node = require('../node');
when.parallel = require('../parallel');
when.pipeline = require('../pipeline');
when.poll = require('../poll');
when.sequence = require('../sequence');
when.timeout = require('../timeout');

},{"../callbacks":2,"../cancelable":3,"../delay":4,"../function":5,"../guard":6,"../keys":7,"../node":23,"../parallel":24,"../pipeline":25,"../poll":26,"../sequence":27,"../timeout":28,"../when":29}],2:[function(require,module,exports){
/** @license MIT License (c) copyright 2013-2014 original author or authors */

/**
 * Collection of helper functions for interacting with 'traditional',
 * callback-taking functions using a promise interface.
 *
 * @author Renato Zannon
 * @contributor Brian Cavalier
 */

(function(define) {
define(function(require) {

	var when, Promise, promise, slice, _liftAll;

	when = require('./when');
	Promise = when.Promise;
	_liftAll = require('./lib/liftAll');
	promise = when.promise;
	slice = Array.prototype.slice;

	return {
		lift: lift,
		liftAll: liftAll,
		apply: apply,
		call: call,
		promisify: promisify
	};

	/**
	 * Takes a `traditional` callback-taking function and returns a promise for its
	 * result, accepting an optional array of arguments (that might be values or
	 * promises). It assumes that the function takes its callback and errback as
	 * the last two arguments. The resolution of the promise depends on whether the
	 * function will call its callback or its errback.
	 *
	 * @example
	 *    var domIsLoaded = callbacks.apply($);
	 *    domIsLoaded.then(function() {
	 *		doMyDomStuff();
	 *	});
	 *
	 * @example
	 *    function existingAjaxyFunction(url, callback, errback) {
	 *		// Complex logic you'd rather not change
	 *	}
	 *
	 *    var promise = callbacks.apply(existingAjaxyFunction, ["/movies.json"]);
	 *
	 *    promise.then(function(movies) {
	 *		// Work with movies
	 *	}, function(reason) {
	 *		// Handle error
	 *	});
	 *
	 * @param {function} asyncFunction function to be called
	 * @param {Array} [extraAsyncArgs] array of arguments to asyncFunction
	 * @returns {Promise} promise for the callback value of asyncFunction
	 */
	function apply(asyncFunction, extraAsyncArgs) {
		return _apply(asyncFunction, this, extraAsyncArgs || []);
	}

	/**
	 * Apply helper that allows specifying thisArg
	 * @private
	 */
	function _apply(asyncFunction, thisArg, extraAsyncArgs) {
		return Promise.all(extraAsyncArgs).then(function(args) {
			var p = Promise._defer();
			args.push(alwaysUnary(p._handler.resolve, p._handler),
				alwaysUnary(p._handler.reject, p._handler));
			asyncFunction.apply(thisArg, args);

			return p;
		});
	}

	/**
	 * Works as `callbacks.apply` does, with the difference that the arguments to
	 * the function are passed individually, instead of as an array.
	 *
	 * @example
	 *    function sumInFiveSeconds(a, b, callback) {
	 *		setTimeout(function() {
	 *			callback(a + b);
	 *		}, 5000);
	 *	}
	 *
	 *    var sumPromise = callbacks.call(sumInFiveSeconds, 5, 10);
	 *
	 *    // Logs '15' 5 seconds later
	 *    sumPromise.then(console.log);
	 *
	 * @param {function} asyncFunction function to be called
	 * @param {...*} args arguments that will be forwarded to the function
	 * @returns {Promise} promise for the callback value of asyncFunction
	 */
	function call(asyncFunction/*, arg1, arg2...*/) {
		return _apply(asyncFunction, this, slice.call(arguments, 1));
	}

	/**
	 * Takes a 'traditional' callback/errback-taking function and returns a function
	 * that returns a promise instead. The resolution/rejection of the promise
	 * depends on whether the original function will call its callback or its
	 * errback.
	 *
	 * If additional arguments are passed to the `lift` call, they will be prepended
	 * on the calls to the original function, much like `Function.prototype.bind`.
	 *
	 * The resulting function is also "promise-aware", in the sense that, if given
	 * promises as arguments, it will wait for their resolution before executing.
	 *
	 * @example
	 *    function traditionalAjax(method, url, callback, errback) {
	 *		var xhr = new XMLHttpRequest();
	 *		xhr.open(method, url);
	 *
	 *		xhr.onload = callback;
	 *		xhr.onerror = errback;
	 *
	 *		xhr.send();
	 *	}
	 *
	 *    var promiseAjax = callbacks.lift(traditionalAjax);
	 *    promiseAjax("GET", "/movies.json").then(console.log, console.error);
	 *
	 *    var promiseAjaxGet = callbacks.lift(traditionalAjax, "GET");
	 *    promiseAjaxGet("/movies.json").then(console.log, console.error);
	 *
	 * @param {Function} f traditional async function to be decorated
	 * @param {...*} [args] arguments to be prepended for the new function
	 * @returns {Function} a promise-returning function
	 */
	function lift(f/*, args...*/) {
		var args = slice.call(arguments, 1);
		return function() {
			return _apply(f, this, args.concat(slice.call(arguments)));
		};
	}

	/**
	 * Lift all the functions/methods on src
	 * @param {object|function} src source whose functions will be lifted
	 * @param {function?} combine optional function for customizing the lifting
	 *  process. It is passed dst, the lifted function, and the property name of
	 *  the original function on src.
	 * @param {(object|function)?} dst option destination host onto which to place lifted
	 *  functions. If not provided, liftAll returns a new object.
	 * @returns {*} If dst is provided, returns dst with lifted functions as
	 *  properties.  If dst not provided, returns a new object with lifted functions.
	 */
	function liftAll(src, combine, dst) {
		return _liftAll(lift, combine, dst, src);
	}

	/**
	 * `promisify` is a version of `lift` that allows fine-grained control over the
	 * arguments that passed to the underlying function. It is intended to handle
	 * functions that don't follow the common callback and errback positions.
	 *
	 * The control is done by passing an object whose 'callback' and/or 'errback'
	 * keys, whose values are the corresponding 0-based indexes of the arguments on
	 * the function. Negative values are interpreted as being relative to the end
	 * of the arguments array.
	 *
	 * If arguments are given on the call to the 'promisified' function, they are
	 * intermingled with the callback and errback. If a promise is given among them,
	 * the execution of the function will only occur after its resolution.
	 *
	 * @example
	 *    var delay = callbacks.promisify(setTimeout, {
	 *		callback: 0
	 *	});
	 *
	 *    delay(100).then(function() {
	 *		console.log("This happens 100ms afterwards");
	 *	});
	 *
	 * @example
	 *    function callbackAsLast(errback, followsStandards, callback) {
	 *		if(followsStandards) {
	 *			callback("well done!");
	 *		} else {
	 *			errback("some programmers just want to watch the world burn");
	 *		}
	 *	}
	 *
	 *    var promisified = callbacks.promisify(callbackAsLast, {
	 *		callback: -1,
	 *		errback:   0,
	 *	});
	 *
	 *    promisified(true).then(console.log, console.error);
	 *    promisified(false).then(console.log, console.error);
	 *
	 * @param {Function} asyncFunction traditional function to be decorated
	 * @param {object} positions
	 * @param {number} [positions.callback] index at which asyncFunction expects to
	 *  receive a success callback
	 * @param {number} [positions.errback] index at which asyncFunction expects to
	 *  receive an error callback
	 *  @returns {function} promisified function that accepts
	 */
	function promisify(asyncFunction, positions) {

		return function() {
			var thisArg = this;
			return Promise.all(arguments).then(function(args) {
				var p = Promise._defer();

				var callbackPos, errbackPos;

				if('callback' in positions) {
					callbackPos = normalizePosition(args, positions.callback);
				}

				if('errback' in positions) {
					errbackPos = normalizePosition(args, positions.errback);
				}

				if(errbackPos < callbackPos) {
					insertCallback(args, errbackPos, p._handler.reject, p._handler);
					insertCallback(args, callbackPos, p._handler.resolve, p._handler);
				} else {
					insertCallback(args, callbackPos, p._handler.resolve, p._handler);
					insertCallback(args, errbackPos, p._handler.reject, p._handler);
				}

				asyncFunction.apply(thisArg, args);

				return p;
			});
		};
	}

	function normalizePosition(args, pos) {
		return pos < 0 ? (args.length + pos + 2) : pos;
	}

	function insertCallback(args, pos, callback, thisArg) {
		if(pos != null) {
			callback = alwaysUnary(callback, thisArg);
			if(pos < 0) {
				pos = args.length + pos + 2;
			}
			args.splice(pos, 0, callback);
		}
	}

	function alwaysUnary(fn, thisArg) {
		return function() {
			if(arguments.length <= 1) {
				fn.apply(thisArg, arguments);
			} else {
				fn.call(thisArg, slice.call(arguments));
			}
		};
	}
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./lib/liftAll":16,"./when":29}],3:[function(require,module,exports){
/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * cancelable.js
 * @deprecated
 *
 * Decorator that makes a deferred "cancelable".  It adds a cancel() method that
 * will call a special cancel handler function and then reject the deferred.  The
 * cancel handler can be used to do resource cleanup, or anything else that should
 * be done before any other rejection handlers are executed.
 *
 * Usage:
 *
 * var cancelableDeferred = cancelable(when.defer(), myCancelHandler);
 *
 * @author brian@hovercraftstudios.com
 */

(function(define) {
define(function() {

    /**
     * Makes deferred cancelable, adding a cancel() method.
	 * @deprecated
     *
     * @param deferred {Deferred} the {@link Deferred} to make cancelable
     * @param canceler {Function} cancel handler function to execute when this deferred
	 * is canceled.  This is guaranteed to run before all other rejection handlers.
	 * The canceler will NOT be executed if the deferred is rejected in the standard
	 * way, i.e. deferred.reject().  It ONLY executes if the deferred is canceled,
	 * i.e. deferred.cancel()
     *
     * @returns deferred, with an added cancel() method.
     */
    return function(deferred, canceler) {
        // Add a cancel method to the deferred to reject the delegate
        // with the special canceled indicator.
        deferred.cancel = function() {
			try {
				deferred.reject(canceler(deferred));
			} catch(e) {
				deferred.reject(e);
			}

			return deferred.promise;
        };

        return deferred;
    };

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(); });



},{}],4:[function(require,module,exports){
/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * delay.js
 *
 * Helper that returns a promise that resolves after a delay.
 *
 * @author Brian Cavalier
 * @author John Hann
 */

(function(define) {
define(function(require) {

	var resolve = require('./when').resolve;

    /**
	 * @deprecated Use when(value).delay(ms)
     */
    return function delay(msec, value) {
		return resolve(value).delay(msec);
    };

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });



},{"./when":29}],5:[function(require,module,exports){
/** @license MIT License (c) copyright 2013-2014 original author or authors */

/**
 * Collection of helper functions for wrapping and executing 'traditional'
 * synchronous functions in a promise interface.
 *
 * @author Brian Cavalier
 * @contributor Renato Zannon
 */

(function(define) {
define(function(require) {

	var when, slice, attempt, _liftAll;

	when = require('./when');
	attempt = when['try'];
	_liftAll = require('./lib/liftAll');
	slice = Array.prototype.slice;

	return {
		lift: lift,
		liftAll: liftAll,
		call: attempt,
		apply: apply,
		compose: compose
	};

	/**
	 * Takes a function and an optional array of arguments (that might be promises),
	 * and calls the function. The return value is a promise whose resolution
	 * depends on the value returned by the function.
	 * @param {function} f function to be called
	 * @param {Array} [args] array of arguments to func
	 * @returns {Promise} promise for the return value of func
	 */
	function apply(f, args) {
		return _apply(f, this, args || []);
	}

	/**
	 * Takes a 'regular' function and returns a version of that function that
	 * returns a promise instead of a plain value, and handles thrown errors by
	 * returning a rejected promise. Also accepts a list of arguments to be
	 * prepended to the new function, as does Function.prototype.bind.
	 *
	 * The resulting function is promise-aware, in the sense that it accepts
	 * promise arguments, and waits for their resolution.
	 * @param {Function} f function to be bound
	 * @param {...*} [args] arguments to be prepended for the new function
	 * @returns {Function} a promise-returning function
	 */
	function lift(f /*, args... */) {
		var args = slice.call(arguments, 1);
		return function() {
			return _apply(f, this, args.concat(slice.call(arguments)));
		};
	}

	/**
	 * Apply helper that allows specifying thisArg
	 * @private
	 */
	function _apply(f, thisArg, args) {
		return args.length === 0
			? attempt.call(thisArg, f)
			: attempt.apply(thisArg, [f].concat(args));
	}

	/**
	 * Lift all the functions/methods on src
	 * @param {object|function} src source whose functions will be lifted
	 * @param {function?} combine optional function for customizing the lifting
	 *  process. It is passed dst, the lifted function, and the property name of
	 *  the original function on src.
	 * @param {(object|function)?} dst option destination host onto which to place lifted
	 *  functions. If not provided, liftAll returns a new object.
	 * @returns {*} If dst is provided, returns dst with lifted functions as
	 *  properties.  If dst not provided, returns a new object with lifted functions.
	 */
	function liftAll(src, combine, dst) {
		return _liftAll(lift, combine, dst, src);
	}

	/**
	 * Composes multiple functions by piping their return values. It is
	 * transparent to whether the functions return 'regular' values or promises:
	 * the piped argument is always a resolved value. If one of the functions
	 * throws or returns a rejected promise, the composed promise will be also
	 * rejected.
	 *
	 * The arguments (or promises to arguments) given to the returned function (if
	 * any), are passed directly to the first function on the 'pipeline'.
	 * @param {Function} f the function to which the arguments will be passed
	 * @param {...Function} [funcs] functions that will be composed, in order
	 * @returns {Function} a promise-returning composition of the functions
	 */
	function compose(f /*, funcs... */) {
		var funcs = slice.call(arguments, 1);

		return function() {
			var thisArg, args, firstPromise;

			thisArg = this;
			args = slice.call(arguments);
			firstPromise = attempt.apply(thisArg, [f].concat(args));

			return when.reduce(funcs, function(arg, func) {
				return func.call(thisArg, arg);
			}, firstPromise);
		};
	}
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });



},{"./lib/liftAll":16,"./when":29}],6:[function(require,module,exports){
/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * Generalized promise concurrency guard
 * Adapted from original concept by Sakari Jokinen (Rocket Pack, Ltd.)
 *
 * @author Brian Cavalier
 * @author John Hann
 * @contributor Sakari Jokinen
 */
(function(define) {
define(function(require) {

	var when = require('./when');

	guard.n = n;

	return guard;

	/**
	 * Creates a guarded version of f that can only be entered when the supplied
	 * condition allows.
	 * @param {function} condition represents a critical section that may only
	 *  be entered when allowed by the condition
	 * @param {function} f function to guard
	 * @returns {function} guarded version of f
	 */
	function guard(condition, f) {
		return function() {
			var self = this;
			var args = arguments;

			return when(condition(), function(exit) {
				return when(f.apply(self, args))['finally'](exit);
			});
		};
	}

	/**
	 * Creates a condition that allows only n simultaneous executions
	 * of a guarded function
	 * @param {number} allowed number of allowed simultaneous executions
	 * @returns {function} condition function which returns a promise that
	 *  fulfills when the critical section may be entered.  The fulfillment
	 *  value is a function ("notifyExit") that must be called when the critical
	 *  section has been exited.
	 */
	function n(allowed) {
		var count = 0;
		var waiting = [];

		return function enter() {
			return when.promise(function(resolve) {
				if(count < allowed) {
					resolve(exit);
				} else {
					waiting.push(resolve);
				}
				count += 1;

				function exit() {
					count = Math.max(count - 1, 0);
					if(waiting.length > 0) {
						waiting.shift()(exit);
					}
				}
			});
		};
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"./when":29}],7:[function(require,module,exports){
/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author Brian Cavalier
 * @author John Hann
 */
(function(define) { 'use strict';
define(function(require) {

	var when = require('./when');
	var toPromise = when.resolve;

	return {
		all: when.lift(all),
		map: map
	};

	/**
	 * Resolve all the key-value pairs in the supplied object or promise
	 * for an object.
	 * @param {Promise|object} object or promise for object whose key-value pairs
	 *  will be resolved
	 * @returns {Promise} promise for an object with the fully resolved key-value pairs
	 */
	function all(object) {
		return when.promise(function(resolve, reject, notify) {
			var results = {};
			var pending = 0;

			for(var k in object) {
				resolveOne(object[k], k);
			}

			if(pending === 0) {
				resolve(results);
			}

			function resolveOne(x, k) {
				++pending;
				toPromise(x).then(function(x) {
					results[k] = x;

					if(--pending === 0) {
						resolve(results);
					}
				}, reject, notify);
			}
		});
	}

	/**
	 * Map values in the supplied object's keys
	 * @param {Promise|object} object or promise for object whose key-value pairs
	 *  will be reduced
	 * @param {function} f mapping function mapFunc(value) which may
	 *  return either a promise or a value
	 * @returns {Promise} promise for an object with the mapped and fully
	 *  resolved key-value pairs
	 */
	function map(object, f) {
		return toPromise(object).then(function(object) {
			return all(Object.keys(object).reduce(function(o, k) {
				o[k] = toPromise(object[k]).then(f);
				return o;
			}, {}));
		});
	}

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./when":29}],8:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function (require) {

	var makePromise = require('./makePromise');
	var Scheduler = require('./scheduler');
	var async = require('./async');

	return makePromise({
		scheduler: new Scheduler(async),
		monitor: typeof console !== 'undefined' ? console : void 0
	});

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./async":11,"./makePromise":17,"./scheduler":19}],9:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {
	/**
	 * Circular queue
	 * @param {number} capacityPow2 power of 2 to which this queue's capacity
	 *  will be set initially. eg when capacityPow2 == 3, queue capacity
	 *  will be 8.
	 * @constructor
	 */
	function Queue(capacityPow2) {
		this.head = this.tail = this.length = 0;
		this.buffer = new Array(1 << capacityPow2);
	}

	Queue.prototype.push = function(x) {
		if(this.length === this.buffer.length) {
			this._ensureCapacity(this.length * 2);
		}

		this.buffer[this.tail] = x;
		this.tail = (this.tail + 1) & (this.buffer.length - 1);
		++this.length;
		return this.length;
	};

	Queue.prototype.shift = function() {
		var x = this.buffer[this.head];
		this.buffer[this.head] = void 0;
		this.head = (this.head + 1) & (this.buffer.length - 1);
		--this.length;
		return x;
	};

	Queue.prototype._ensureCapacity = function(capacity) {
		var head = this.head;
		var buffer = this.buffer;
		var newBuffer = new Array(capacity);
		var i = 0;
		var len;

		if(head === 0) {
			len = this.length;
			for(; i<len; ++i) {
				newBuffer[i] = buffer[i];
			}
		} else {
			capacity = buffer.length;
			len = this.tail;
			for(; head<capacity; ++i, ++head) {
				newBuffer[i] = buffer[head];
			}

			for(head=0; head<len; ++i, ++head) {
				newBuffer[i] = buffer[head];
			}
		}

		this.buffer = newBuffer;
		this.head = 0;
		this.tail = this.length;
	};

	return Queue;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],10:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function array(Promise) {

		var arrayMap = Array.prototype.map;
		var arrayReduce = Array.prototype.reduce;
		var arrayReduceRight = Array.prototype.reduceRight;
		var arrayForEach = Array.prototype.forEach;

		var toPromise = Promise.resolve;
		var all = Promise.all;

		// Additional array combinators

		Promise.any = any;
		Promise.some = some;
		Promise.settle = settle;

		Promise.map = map;
		Promise.reduce = reduce;
		Promise.reduceRight = reduceRight;

		/**
		 * When this promise fulfills with an array, do
		 * onFulfilled.apply(void 0, array)
		 * @param (function) onFulfilled function to apply
		 * @returns {Promise} promise for the result of applying onFulfilled
		 */
		Promise.prototype.spread = function(onFulfilled) {
			return this.then(all).then(function(array) {
				return onFulfilled.apply(void 0, array);
			});
		};

		return Promise;

		/**
		 * One-winner competitive race.
		 * Return a promise that will fulfill when one of the promises
		 * in the input array fulfills, or will reject when all promises
		 * have rejected.
		 * @param {array} promises
		 * @returns {Promise} promise for the first fulfilled value
		 */
		function any(promises) {
			return new Promise(function(resolve, reject) {
				var pending = 0;
				var errors = [];

				arrayForEach.call(promises, function(p) {
					++pending;
					toPromise(p).then(resolve, handleReject);
				});

				if(pending === 0) {
					resolve();
				}

				function handleReject(e) {
					errors.push(e);
					if(--pending === 0) {
						reject(errors);
					}
				}
			});
		}

		/**
		 * N-winner competitive race
		 * Return a promise that will fulfill when n input promises have
		 * fulfilled, or will reject when it becomes impossible for n
		 * input promises to fulfill (ie when promises.length - n + 1
		 * have rejected)
		 * @param {array} promises
		 * @param {number} n
		 * @returns {Promise} promise for the earliest n fulfillment values
		 */
		function some(promises, n) {
			return new Promise(function(resolve, reject, notify) {
				var nFulfill = 0;
				var nReject;
				var results = [];
				var errors = [];

				arrayForEach.call(promises, function(p) {
					++nFulfill;
					toPromise(p).then(handleResolve, handleReject, notify);
				});

				n = Math.max(n, 0);
				nReject = (nFulfill - n + 1);
				nFulfill = Math.min(n, nFulfill);

				if(nFulfill === 0) {
					resolve(results);
					return;
				}

				function handleResolve(x) {
					if(nFulfill > 0) {
						--nFulfill;
						results.push(x);

						if(nFulfill === 0) {
							resolve(results);
						}
					}
				}

				function handleReject(e) {
					if(nReject > 0) {
						--nReject;
						errors.push(e);

						if(nReject === 0) {
							reject(errors);
						}
					}
				}
			});
		}

		/**
		 * Apply f to the value of each promise in a list of promises
		 * and return a new list containing the results.
		 * @param {array} promises
		 * @param {function} f
		 * @param {function} fallback
		 * @returns {Promise}
		 */
		function map(promises, f, fallback) {
			return all(arrayMap.call(promises, function(x) {
				return toPromise(x).then(f, fallback);
			}));
		}

		/**
		 * Return a promise that will always fulfill with an array containing
		 * the outcome states of all input promises.  The returned promise
		 * will never reject.
		 * @param {array} promises
		 * @returns {Promise}
		 */
		function settle(promises) {
			return all(arrayMap.call(promises, function(p) {
				p = toPromise(p);
				return p.then(inspect, inspect);

				function inspect() {
					return p.inspect();
				}
			}));
		}

		function reduce(promises, f) {
			return arguments.length > 2
				? arrayReduce.call(promises, reducer, arguments[2])
				: arrayReduce.call(promises, reducer);

			function reducer(result, x, i) {
				return toPromise(result).then(function(r) {
					return toPromise(x).then(function(x) {
						return f(r, x, i);
					});
				});
			}
		}

		function reduceRight(promises, f) {
			return arguments.length > 2
				? arrayReduceRight.call(promises, reducer, arguments[2])
				: arrayReduceRight.call(promises, reducer);

			function reducer(result, x, i) {
				return toPromise(result).then(function(r) {
					return toPromise(x).then(function(x) {
						return f(r, x, i);
					});
				});
			}
		}
	};


});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],11:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	// Sniff "best" async scheduling option
	// Prefer process.nextTick or MutationObserver, then check for
	// vertx and finally fall back to setTimeout

	/*jshint maxcomplexity:6*/
	/*global process,document,setTimeout,MutationObserver,WebKitMutationObserver*/
	var nextTick, MutationObs;

	if (typeof process !== 'undefined' && process !== null &&
		typeof process.nextTick === 'function') {
		nextTick = function(f) {
			process.nextTick(f);
		};

	} else if (MutationObs =
		(typeof MutationObserver === 'function' && MutationObserver) ||
		(typeof WebKitMutationObserver === 'function' && WebKitMutationObserver)) {
		nextTick = (function (document, MutationObserver) {
			var scheduled;
			var el = document.createElement('div');
			var o = new MutationObserver(run);
			o.observe(el, { attributes: true });

			function run() {
				var f = scheduled;
				scheduled = void 0;
				f();
			}

			return function (f) {
				scheduled = f;
				el.setAttribute('class', 'x');
			};
		}(document, MutationObs));

	} else {
		nextTick = (function(cjsRequire) {
			try {
				// vert.x 1.x || 2.x
				return cjsRequire('vertx').runOnLoop || cjsRequire('vertx').runOnContext;
			} catch (ignore) {}

			// capture setTimeout to avoid being caught by fake timers
			// used in time based tests
			var capturedSetTimeout = setTimeout;
			return function (t) {
				capturedSetTimeout(t, 0);
			};
		}(require));
	}

	return nextTick;
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{}],12:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var setTimer = require('./timer').set;

	return function(e) {
		setTimer(function() {
			throw e;
		}, 0);
	};
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"./timer":21}],13:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var fatal = require('./fatal');

	return function flow(Promise) {

		var resolve = Promise.resolve;
		var reject = Promise.reject;
		var origCatch = Promise.prototype['catch'];

		/**
		 * Handle the ultimate fulfillment value or rejection reason, and assume
		 * responsibility for all errors.  If an error propagates out of result
		 * or handleFatalError, it will be rethrown to the host, resulting in a
		 * loud stack track on most platforms and a crash on some.
		 * @param {function?} onResult
		 * @param {function?} onError
		 * @returns {undefined}
		 */
		Promise.prototype.done = function(onResult, onError) {
			var h = this._handler;
			h.when(this._maybeFatal, noop, this, h.receiver, onResult, onError);
		};

		/**
		 * Check if x is a rejected promise, and if so, delegate to this._fatal
		 * @private
		 * @param {*} x
		 */
		Promise.prototype._maybeFatal = function(x) {
			if(Object(x) === x) {
				resolve(x)['catch'](this._fatal);
			}
		};

		/**
		 * Propagate fatal errors to the host environment.
		 * @private
		 */
		Promise.prototype._fatal = fatal;

		/**
		 * Add Error-type and predicate matching to catch.  Examples:
		 * promise.catch(TypeError, handleTypeError)
		 *   .catch(predicate, handleMatchedErrors)
		 *   .catch(handleRemainingErrors)
		 * @param onRejected
		 * @returns {*}
		 */
		Promise.prototype['catch'] = Promise.prototype.otherwise = function(onRejected) {
			if (arguments.length === 1) {
				return origCatch.call(this, onRejected);
			} else {
				if(typeof onRejected !== 'function') {
					return this.ensure(rejectInvalidPredicate);
				}

				return origCatch.call(this, createCatchFilter(arguments[1], onRejected));
			}
		};

		/**
		 * Wraps the provided catch handler, so that it will only be called
		 * if the predicate evaluates truthy
		 * @param {?function} handler
		 * @param {function} predicate
		 * @returns {function} conditional catch handler
		 */
		function createCatchFilter(handler, predicate) {
			return function(e) {
				return evaluatePredicate(e, predicate)
					? handler.call(this, e)
					: reject(e);
			};
		}

		/**
		 * Ensures that onFulfilledOrRejected will be called regardless of whether
		 * this promise is fulfilled or rejected.  onFulfilledOrRejected WILL NOT
		 * receive the promises' value or reason.  Any returned value will be disregarded.
		 * onFulfilledOrRejected may throw or return a rejected promise to signal
		 * an additional error.
		 * @param {function} handler handler to be called regardless of
		 *  fulfillment or rejection
		 * @returns {Promise}
		 */
		Promise.prototype['finally'] = Promise.prototype.ensure = function(handler) {
			if(typeof handler !== 'function') {
				// Optimization: result will not change, return same promise
				return this;
			}

			handler = isolate(handler, this);
			return this.then(handler, handler);
		};

		/**
		 * Recover from a failure by returning a defaultValue.  If defaultValue
		 * is a promise, it's fulfillment value will be used.  If defaultValue is
		 * a promise that rejects, the returned promise will reject with the
		 * same reason.
		 * @param {*} defaultValue
		 * @returns {Promise} new promise
		 */
		Promise.prototype['else'] = Promise.prototype.orElse = function(defaultValue) {
			return this.then(void 0, function() {
				return defaultValue;
			});
		};

		/**
		 * Shortcut for .then(function() { return value; })
		 * @param  {*} value
		 * @return {Promise} a promise that:
		 *  - is fulfilled if value is not a promise, or
		 *  - if value is a promise, will fulfill with its value, or reject
		 *    with its reason.
		 */
		Promise.prototype['yield'] = function(value) {
			return this.then(function() {
				return value;
			});
		};

		/**
		 * Runs a side effect when this promise fulfills, without changing the
		 * fulfillment value.
		 * @param {function} onFulfilledSideEffect
		 * @returns {Promise}
		 */
		Promise.prototype.tap = function(onFulfilledSideEffect) {
			return this.then(onFulfilledSideEffect)['yield'](this);
		};

		return Promise;
	};

	function rejectInvalidPredicate() {
		throw new TypeError('catch predicate must be a function');
	}

	function evaluatePredicate(e, predicate) {
		return isError(predicate) ? e instanceof predicate : predicate(e);
	}

	function isError(predicate) {
		return predicate === Error
			|| (predicate != null && predicate.prototype instanceof Error);
	}

	// prevent argument passing to f and ignore return value
	function isolate(f, x) {
		return function() {
			f.call(this);
			return x;
		};
	}

	function noop() {}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"./fatal":12}],14:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function inspect(Promise) {

		Promise.prototype.inspect = function() {
			return this._handler.inspect();
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],15:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function generate(Promise) {

		var resolve = Promise.resolve;

		Promise.iterate = iterate;
		Promise.unfold = unfold;

		return Promise;

		/**
		 * Generate a (potentially infinite) stream of promised values:
		 * x, f(x), f(f(x)), etc. until condition(x) returns true
		 * @param {function} f function to generate a new x from the previous x
		 * @param {function} condition function that, given the current x, returns
		 *  truthy when the iterate should stop
		 * @param {function} handler function to handle the value produced by f
		 * @param {*|Promise} x starting value, may be a promise
		 * @return {Promise} the result of the last call to f before
		 *  condition returns true
		 */
		function iterate(f, condition, handler, x) {
			return resolve(x).then(function(x) {
				return resolve(condition(x)).then(function(done) {
					return done ? x : next(x);
				});
			});

			function next(nextValue) {
				return resolve(handler(nextValue)).then(function() {
					return iterate(f, condition, handler, f(nextValue));
				});
			}
		}

		/**
		 * Generate a (potentially infinite) stream of promised values
		 * by applying handler(generator(seed)) iteratively until
		 * condition(seed) returns true.
		 * @param {function} unspool function that generates a [value, newSeed]
		 *  given a seed.
		 * @param {function} condition function that, given the current seed, returns
		 *  truthy when the unfold should stop
		 * @param {function} handler function to handle the value produced by unspool
		 * @param x {*|Promise} starting value, may be a promise
		 * @return {Promise} the result of the last value produced by unspool before
		 *  condition returns true
		 */
		function unfold(unspool, condition, handler, x) {
			return resolve(x).then(function(seed) {
				return resolve(condition(seed)).then(function(done) {
					return done ? seed : resolve(unspool(seed)).spread(next);
				});
			});

			function next(item, newSeed) {
				return resolve(handler(item)).then(function() {
					return unfold(unspool, condition, handler, newSeed);
				});
			}
		}
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],16:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function liftAll(liftOne, combine, dst, src) {
		if(typeof combine === 'undefined') {
			combine = defaultCombine;
		}

		return Object.keys(src).reduce(function(dst, key) {
			var f = src[key];
			return typeof f === 'function' ? combine(dst, liftOne(f), key) : dst;
		}, typeof dst === 'undefined' ? defaultDst(src) : dst);
	};

	function defaultCombine(o, f, k) {
		o[k] = f;
		return o;
	}

	function defaultDst(src) {
		return typeof src === 'function' ? src.bind() : Object.create(src);
	}
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],17:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function makePromise(environment) {

		var foreverPendingPromise;
		var promiseCycleError;
		var tasks = environment.scheduler;

		var objectCreate = Object.create ||
			function(proto) {
				function Child() {}
				Child.prototype = proto;
				return new Child();
			};

		/**
		 * Create a promise whose fate is determined by resolver
		 * @constructor
		 * @returns {Promise} promise
		 * @name Promise
		 */
		function Promise(resolver) {
			var self = this;
			this._handler = new DeferredHandler();

			runResolver(resolver, promiseResolve, promiseReject, promiseNotify);

			/**
			 * Transition from pre-resolution state to post-resolution state, notifying
			 * all listeners of the ultimate fulfillment or rejection
			 * @param {*} x resolution value
			 */
			function promiseResolve (x) {
				self._handler.resolve(x);
			}
			/**
			 * Reject this promise with reason, which will be used verbatim
			 * @param {*} reason reason for the rejection, typically an Error
			 */
			function promiseReject (reason) {
				self._handler.reject(reason);
			}

			/**
			 * Issue a progress event, notifying all progress listeners
			 * @param {*} x progress event payload to pass to all listeners
			 */
			function promiseNotify (x) {
				self._handler.notify(x);
			}
		}

		function runResolver(resolver, promiseResolve, promiseReject, promiseNotify) {
			try {
				resolver(promiseResolve, promiseReject, promiseNotify);
			} catch (e) {
				promiseReject(e);
			}
		}

		// Creation

		Promise.resolve = resolve;
		Promise.reject = reject;
		Promise.never = never;

		Promise._defer = defer;

		/**
		 * Returns a trusted promise. If x is already a trusted promise, it is
		 * returned, otherwise returns a new trusted Promise which follows x.
		 * @param  {*} x
		 * @return {Promise} promise
		 */
		function resolve(x) {
			return x instanceof Promise ? x
				: new InternalPromise(new AsyncHandler(getHandler(x)));
		}

		/**
		 * Return a reject promise with x as its reason (x is used verbatim)
		 * @param {*} x
		 * @returns {Promise} rejected promise
		 */
		function reject(x) {
			return new InternalPromise(new AsyncHandler(new RejectedHandler(x)));
		}

		/**
		 * Return a promise that remains pending forever
		 * @returns {Promise} forever-pending promise.
		 */
		function never() {
			return foreverPendingPromise; // Should be frozen
		}

		/**
		 * Creates an internal {promise, resolver} pair
		 * @private
		 * @returns {{resolver: DeferredHandler, promise: InternalPromise}}
		 */
		function defer() {
			return new InternalPromise(new DeferredHandler());
		}

		// Transformation and flow control

		/**
		 * Transform this promise's fulfillment value, returning a new Promise
		 * for the transformed result.  If the promise cannot be fulfilled, onRejected
		 * is called with the reason.  onProgress *may* be called with updates toward
		 * this promise's fulfillment.
		 * @param [onFulfilled] {Function} fulfillment handler
		 * @param [onRejected] {Function} rejection handler
		 * @param [onProgress] {Function} progress handler
		 * @return {Promise} new promise
		 */
		Promise.prototype.then = function(onFulfilled, onRejected, onProgress) {
			var from = this._handler;
			var to = new DeferredHandler(from.receiver);
			from.when(to.resolve, to.notify, to, from.receiver, onFulfilled, onRejected, onProgress);

			return new InternalPromise(to);
		};

		/**
		 * If this promise cannot be fulfilled due to an error, call onRejected to
		 * handle the error. Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @return {Promise}
		 */
		Promise.prototype['catch'] = Promise.prototype.otherwise = function(onRejected) {
			return this.then(void 0, onRejected);
		};

		/**
		 * Private function to bind a thisArg for this promise's handlers
		 * @private
		 * @param {object} thisArg `this` value for all handlers attached to
		 *  the returned promise.
		 * @returns {Promise}
		 */
		Promise.prototype._bindContext = function(thisArg) {
			return new InternalPromise(new BoundHandler(this._handler, thisArg));
		};

		// Array combinators

		Promise.all = all;
		Promise.race = race;

		/**
		 * Return a promise that will fulfill when all promises in the
		 * input array have fulfilled, or will reject when one of the
		 * promises rejects.
		 * @param {array} promises array of promises
		 * @returns {Promise} promise for array of fulfillment values
		 */
		function all(promises) {
			/*jshint maxcomplexity:6*/
			var resolver = new DeferredHandler();
			var len = promises.length >>> 0;
			var pending = len;
			var results = [];
			var i, x;

			for (i = 0; i < len; ++i) {
				if (i in promises) {
					x = promises[i];
					if (maybeThenable(x)) {
						resolveOne(resolver, results, getHandlerChecked(x), i);
					} else {
						results[i] = x;
						--pending;
					}
				} else {
					--pending;
				}
			}

			if(pending === 0) {
				resolver.resolve(results);
			}

			return new InternalPromise(resolver);

			function resolveOne(resolver, results, handler, i) {
				handler.when(noop, noop, void 0, resolver, function(x) {
					results[i] = x;
					if(--pending === 0) {
						this.resolve(results);
					}
				}, resolver.reject, resolver.notify);
			}
		}

		/**
		 * Fulfill-reject competitive race. Return a promise that will settle
		 * to the same state as the earliest input promise to settle.
		 *
		 * WARNING: The ES6 Promise spec requires that race()ing an empty array
		 * must return a promise that is pending forever.  This implementation
		 * returns a singleton forever-pending promise, the same singleton that is
		 * returned by Promise.never(), thus can be checked with ===
		 *
		 * @param {array} promises array of promises to race
		 * @returns {Promise} if input is non-empty, a promise that will settle
		 * to the same outcome as the earliest input promise to settle. if empty
		 * is empty, returns a promise that will never settle.
		 */
		function race(promises) {
			// Sigh, race([]) is untestable unless we return *something*
			// that is recognizable without calling .then() on it.
			if(Object(promises) === promises && promises.length === 0) {
				return never();
			}

			var h = new DeferredHandler();
			for(var i=0; i<promises.length; ++i) {
				getHandler(promises[i]).when(noop, noop, void 0, h, h.resolve, h.reject);
			}

			return new InternalPromise(h);
		}

		// Promise internals

		/**
		 * InternalPromise represents a promise that is either already
		 * fulfilled or reject, or is following another promise, based
		 * on the provided handler.
		 * @private
		 * @param {object} handler
		 * @constructor
		 */
		function InternalPromise(handler) {
			this._handler = handler;
		}

		InternalPromise.prototype = objectCreate(Promise.prototype);

		/**
		 * Get an appropriate handler for x
		 * @private
		 * @param {*} x
		 * @param {object?} h optional handler to check for cycles
		 * @returns {object} handler
		 */
		function getHandler(x, h) {
			if(x instanceof Promise) {
				return getHandlerPromise(x, h);
			}
			return maybeThenable(x) ? getHandlerUntrusted(x) : new FulfilledHandler(x);
		}

		function getHandlerChecked(x, h) {
			return x instanceof Promise
				? getHandlerPromise(x, h) : getHandlerUntrusted(x);
		}

		function getHandlerPromise(x, h) {
			var h2 = x._handler.join();
			return h === h2 ? promiseCycleError : h2;
		}

		function getHandlerUntrusted(x) {
			try {
				var untrustedThen = x.then;
				return typeof untrustedThen === 'function'
					? new ThenableHandler(untrustedThen, x)
					: new FulfilledHandler(x);
			} catch(e) {
				return new RejectedHandler(e);
			}
		}

		/**
		 * Handler for a promise that is pending forever
		 * @private
		 * @constructor
		 */
		function Handler() {}

		Handler.prototype.inspect = toPendingState;
		Handler.prototype.when = noop;
		Handler.prototype.resolve = noop;
		Handler.prototype.reject = noop;
		Handler.prototype.notify = noop;
		Handler.prototype.join = function() { return this; };

		Handler.prototype._env = environment.monitor || Promise;
		Handler.prototype._addTrace = noop;
		Handler.prototype._isMonitored = function() {
			return typeof this._env.promiseMonitor !== 'undefined';
		};

		/**
		 * Abstract base for handler that delegates to another handler
		 * @private
		 * @param {object} handler
		 * @constructor
		 */
		function DelegateHandler(handler) {
			this.handler = handler;
		}

		DelegateHandler.prototype = objectCreate(Handler.prototype);

		DelegateHandler.prototype.join = function() {
			return this.handler.join();
		};

		DelegateHandler.prototype.inspect = function() {
			return this.handler.inspect();
		};

		DelegateHandler.prototype._addTrace = function(trace) {
			return this.handler._addTrace(trace);
		};

		/**
		 * Handler that manages a queue of consumers waiting on a pending promise
		 * @private
		 * @constructor
		 */
		function DeferredHandler(receiver) {
			this.consumers = [];
			this.receiver = receiver;
			this.handler = void 0;
			this.resolved = false;
			if(this._isMonitored()) {
				this.trace = this._env.promiseMonitor.captureStack();
			}
		}

		DeferredHandler.prototype = objectCreate(Handler.prototype);

		DeferredHandler.prototype.inspect = function() {
			return this.resolved ? this.handler.join().inspect() : toPendingState();
		};

		DeferredHandler.prototype.resolve = function(x) {
			this._join(getHandler(x, this));
		};

		DeferredHandler.prototype.reject = function(x) {
			this._join(new RejectedHandler(x));
		};

		DeferredHandler.prototype.join = function() {
			return this.resolved ? this.handler.join() : this;
		};

		DeferredHandler.prototype.run = function() {
			var q = this.consumers;
			var handler = this.handler = this.handler.join();
			this.consumers = void 0;

			for (var i = 0; i < q.length; i+=7) {
				handler.when(q[i], q[i+1], q[i+2], q[i+3], q[i+4], q[i+5], q[i+6]);
			}
		};

		DeferredHandler.prototype._join = function(handler) {
			if(this.resolved) {
				return;
			}

			this.resolved = true;
			this.handler = handler;
			tasks.enqueue(this);

			if(this._isMonitored()) {
				this.trace = handler._addTrace(this.trace);
			}
		};

		DeferredHandler.prototype.when = function(resolve, notify, t, receiver, f, r, u) {
			if(this.resolved) {
				tasks.enqueue(new RunHandlerTask(resolve, notify, t, receiver, f, r, u, this.handler.join()));
			} else {
				this.consumers.push(resolve, notify, t, receiver, f, r, u);
			}
		};

		DeferredHandler.prototype.notify = function(x) {
			if(!this.resolved) {
				tasks.enqueue(new ProgressTask(this.consumers, x));
			}
		};

		DeferredHandler.prototype._addTrace = function(trace) {
			return this.resolved ? this.handler._addTrace(trace) : trace;
		};

		/**
		 * Wrap another handler and force it into a future stack
		 * @private
		 * @param {object} handler
		 * @constructor
		 */
		function AsyncHandler(handler) {
			DelegateHandler.call(this, handler);
			if(this._isMonitored()) {
				this.trace = handler._addTrace(this._env.promiseMonitor.captureStack());
			}
		}

		AsyncHandler.prototype = objectCreate(DelegateHandler.prototype);

		AsyncHandler.prototype.when = function(resolve, notify, t, receiver, f, r, u) {
			tasks.enqueue(new RunHandlerTask(resolve, notify, t, receiver, f, r, u, this.join()));
		};

		/**
		 * Handler that follows another handler, injecting a receiver
		 * @private
		 * @param {object} handler another handler to follow
		 * @param {object=undefined} receiver
		 * @constructor
		 */
		function BoundHandler(handler, receiver) {
			DelegateHandler.call(this, handler);
			this.receiver = receiver;
		}

		BoundHandler.prototype = objectCreate(DelegateHandler.prototype);

		BoundHandler.prototype.when = function(resolve, notify, t, receiver, f, r, u) {
			// Because handlers are allowed to be shared among promises,
			// each of which possibly having a different receiver, we have
			// to insert our own receiver into the chain if it has been set
			// so that callbacks (f, r, u) will be called using our receiver
			if(this.receiver !== void 0) {
				receiver = this.receiver;
			}
			this.join().when(resolve, notify, t, receiver, f, r, u);
		};

		/**
		 * Handler that wraps an untrusted thenable and assimilates it in a future stack
		 * @private
		 * @param {function} then
		 * @param {{then: function}} thenable
		 * @constructor
		 */
		function ThenableHandler(then, thenable) {
			DeferredHandler.call(this);
			this.assimilated = false;
			this.untrustedThen = then;
			this.thenable = thenable;
		}

		ThenableHandler.prototype = objectCreate(DeferredHandler.prototype);

		ThenableHandler.prototype.when = function(resolve, notify, t, receiver, f, r, u) {
			if(!this.assimilated) {
				this.assimilated = true;
				this._assimilate();
			}
			DeferredHandler.prototype.when.call(this, resolve, notify, t, receiver, f, r, u);
		};

		ThenableHandler.prototype._assimilate = function() {
			var h = this;
			this._try(this.untrustedThen, this.thenable, _resolve, _reject, _notify);

			function _resolve(x) { h.resolve(x); }
			function _reject(x)  { h.reject(x); }
			function _notify(x)  { h.notify(x); }
		};

		ThenableHandler.prototype._try = function(then, thenable, resolve, reject, notify) {
			try {
				then.call(thenable, resolve, reject, notify);
			} catch (e) {
				reject(e);
			}
		};

		/**
		 * Handler for a fulfilled promise
		 * @private
		 * @param {*} x fulfillment value
		 * @constructor
		 */
		function FulfilledHandler(x) {
			this.value = x;
		}

		FulfilledHandler.prototype = objectCreate(Handler.prototype);

		FulfilledHandler.prototype.inspect = function() {
			return toFulfilledState(this.value);
		};

		FulfilledHandler.prototype.when = function(resolve, notify, t, receiver, f) {
			var x = typeof f === 'function'
				? tryCatchReject(f, this.value, receiver)
				: this.value;

			resolve.call(t, x);
		};

		FulfilledHandler.prototype._addTrace = noop;

		/**
		 * Handler for a rejected promise
		 * @private
		 * @param {*} x rejection reason
		 * @constructor
		 */
		function RejectedHandler(x, observed) {
			this.value = x;

			if(this._isMonitored()) {
				this.observed = !!observed;
				this.key = this.observed ? -1 : this._env.promiseMonitor.startTrace(x);
			}
		}

		RejectedHandler.prototype = objectCreate(Handler.prototype);

		RejectedHandler.prototype.inspect = function() {
			return toRejectedState(this.value);
		};

		RejectedHandler.prototype.when = function(resolve, notify, t, receiver, f, r) {
			if(this._isMonitored() && !this.observed) {
				this.observed = true;
				this._env.promiseMonitor.removeTrace(this.key);
			}

			var x = typeof r === 'function'
				? tryCatchReject(r, this.value, receiver)
				: reject(this.value);

			resolve.call(t, x);
		};

		RejectedHandler.prototype._addTrace = function(trace) {
			if(!this.observed) {
				this._env.promiseMonitor.updateTrace(this.key, trace);
			}
		};

		// Errors and singletons

		foreverPendingPromise = new InternalPromise(new Handler());
		promiseCycleError = new RejectedHandler(new TypeError('Promise cycle'), true);

		// Snapshot states

		/**
		 * Creates a fulfilled state snapshot
		 * @private
		 * @param {*} x any value
		 * @returns {{state:'fulfilled',value:*}}
		 */
		function toFulfilledState(x) {
			return { state: 'fulfilled', value: x };
		}

		/**
		 * Creates a rejected state snapshot
		 * @private
		 * @param {*} x any reason
		 * @returns {{state:'rejected',reason:*}}
		 */
		function toRejectedState(x) {
			return { state: 'rejected', reason: x };
		}

		/**
		 * Creates a pending state snapshot
		 * @private
		 * @returns {{state:'pending'}}
		 */
		function toPendingState() {
			return { state: 'pending' };
		}

		// Task runners

		/**
		 * Run a single consumer
		 * @private
		 * @constructor
		 */
		function RunHandlerTask(a, b, c, d, e, f, g, handler) {
			this.a=a;this.b=b;this.c=c;this.d=d;this.e=e;this.f=f;this.g=g;
			this.handler = handler;
		}

		RunHandlerTask.prototype.run = function() {
			this.handler.when(this.a, this.b, this.c, this.d, this.e, this.f, this.g);
		};

		/**
		 * Run a queue of progress handlers
		 * @private
		 * @constructor
		 */
		function ProgressTask(q, value) {
			this.q = q;
			this.value = value;
		}

		ProgressTask.prototype.run = function() {
			var q = this.q;
			// First progress handler is at index 1
			for (var i = 1; i < q.length; i+=7) {
				this._notify(q[i], q[i+1], q[i+2], q[i+5]);
			}
		};

		ProgressTask.prototype._notify = function(notify, t, receiver, u) {
			var x = typeof u === 'function'
				? tryCatchReturn(u, this.value, receiver)
				: this.value;

			notify.call(t, x);
		};

		/**
		 * @param {*} x
		 * @returns {boolean} false iff x is guaranteed not to be a thenable
		 */
		function maybeThenable(x) {
			return (typeof x === 'object' || typeof x === 'function') && x !== null;
		}

		/**
		 * Return f.call(thisArg, x), or if it throws return a rejected promise for
		 * the thrown exception
		 * @private
		 */
		function tryCatchReject(f, x, thisArg) {
			try {
				return f.call(thisArg, x);
			} catch(e) {
				return reject(e);
			}
		}

		/**
		 * Return f.call(thisArg, x), or if it throws, *return* the exception
		 * @private
		 */
		function tryCatchReturn(f, x, thisArg) {
			try {
				return f.call(thisArg, x);
			} catch(e) {
				return e;
			}
		}

		function noop() {}

		return Promise;
	};
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],18:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function progress(Promise) {

		/**
		 * Register a progress handler for this promise
		 * @param {function} onProgress
		 * @returns {Promise}
		 */
		Promise.prototype.progress = function(onProgress) {
			return this.then(void 0, void 0, onProgress);
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],19:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var Queue = require('./Queue');

	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for next-tick conflation.

	function Scheduler(enqueue) {
		this._enqueue = enqueue;
		this._handlerQueue = new Queue(15);

		var self = this;
		this.drainQueue = function() {
			self._drainQueue();
		};
	}

	/**
	 * Enqueue a task. If the queue is not currently scheduled to be
	 * drained, schedule it.
	 * @param {function} task
	 */
	Scheduler.prototype.enqueue = function(task) {
		if(this._handlerQueue.push(task) === 1) {
			this._enqueue(this.drainQueue);
		}
	};

	/**
	 * Drain the handler queue entirely, being careful to allow the
	 * queue to be extended while it is being processed, and to continue
	 * processing until it is truly empty.
	 */
	Scheduler.prototype._drainQueue = function() {
		var q = this._handlerQueue;
		while(q.length > 0) {
			q.shift().run();
		}
	};

	return Scheduler;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"./Queue":9}],20:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function timed(setTimer, cancelTimer, Promise) {
		/**
		 * Return a new promise that fulfills with the same
		 * @param ms
		 * @returns {Object.constructor}
		 */
		Promise.prototype.delay = function(ms) {
			var self = this;

			return new this.constructor(function(resolve, reject, notify) {
				self.then(function(x) {
					setTimer(function() {
						resolve(x);
					}, ms);
				}, reject, notify);
			});
		};

		/**
		 * Return a new promise that rejects after ms milliseconds unless
		 * this promise fulfills earlier, in which case the returned promise
		 * fulfills with the same value.
		 * @param {number} ms milliseconds
		 * @returns {Promise}
		 */
		Promise.prototype.timeout = function(ms) {
			var self = this;
			return new this.constructor(function(resolve, reject, notify) {

				var timer = setTimer(function onTimeout() {
					reject(new Error('timed out after ' + ms + 'ms'));
				}, ms);

				self.then(
					function onFulfill(x) {
						cancelTimer(timer);
						resolve(x);
					},
					function onReject(x) {
						cancelTimer(timer);
						reject(x);
					},
					notify
				);
			});
		};

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],21:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {
	/*global setTimeout,clearTimeout*/
	var cjsRequire, vertx, setTimer, clearTimer;

	cjsRequire = require;

	try {
		vertx = cjsRequire('vertx');
		setTimer = function (f, ms) { return vertx.setTimer(ms, f); };
		clearTimer = vertx.cancelTimer;
	} catch (e) {
		setTimer = setTimeout;
		clearTimer = clearTimeout;
	}

	return {
		set: setTimer,
		clear: clearTimer
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{}],22:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function addWith(Promise) {
		/**
		 * Returns a promise whose handlers will be called with `this` set to
		 * the supplied `thisArg`.  Subsequent promises derived from the
		 * returned promise will also have their handlers called with `thisArg`.
		 * Calling `with` with undefined or no arguments will return a promise
		 * whose handlers will again be called in the usual Promises/A+ way (no `this`)
		 * thus safely undoing any previous `with` in the promise chain.
		 *
		 * WARNING: Promises returned from `with`/`withThis` are NOT Promises/A+
		 * compliant, specifically violating 2.2.5 (http://promisesaplus.com/#point-41)
		 *
		 * @param {object} thisArg `this` value for all handlers attached to
		 *  the returned promise.
		 * @returns {Promise}
		 */
		Promise.prototype['with'] = Promise.prototype.withThis
			= Promise.prototype._bindContext;

		return Promise;
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));


},{}],23:[function(require,module,exports){
/** @license MIT License (c) copyright 2013 original author or authors */

/**
 * Collection of helpers for interfacing with node-style asynchronous functions
 * using promises.
 *
 * @author Brian Cavalier
 * @contributor Renato Zannon
 */

(function(define) {
define(function(require) {

	var when, Promise, slice, setTimer, _liftAll;

	when = require('./when');
	Promise = when.Promise;
	_liftAll = require('./lib/liftAll');
	setTimer = require('./lib/timer').set;
	slice = Array.prototype.slice;

	return {
		lift: lift,
		liftAll: liftAll,
		apply: apply,
		call: call,
		createCallback: createCallback,
		bindCallback: bindCallback,
		liftCallback: liftCallback
	};

	/**
	 * Takes a node-style async function and calls it immediately (with an optional
	 * array of arguments or promises for arguments). It returns a promise whose
	 * resolution depends on whether the async functions calls its callback with the
	 * conventional error argument or not.
	 *
	 * With this it becomes possible to leverage existing APIs while still reaping
	 * the benefits of promises.
	 *
	 * @example
	 *    function onlySmallNumbers(n, callback) {
	 *		if(n < 10) {
	 *			callback(null, n + 10);
	 *		} else {
	 *			callback(new Error("Calculation failed"));
	 *		}
	 *	}
	 *
	 *    var nodefn = require("when/node/function");
	 *
	 *    // Logs '15'
	 *    nodefn.apply(onlySmallNumbers, [5]).then(console.log, console.error);
	 *
	 *    // Logs 'Calculation failed'
	 *    nodefn.apply(onlySmallNumbers, [15]).then(console.log, console.error);
	 *
	 * @param {function} func node-style function that will be called
	 * @param {Array} [args] array of arguments to func
	 * @returns {Promise} promise for the value func passes to its callback
	 */
	function apply(func, args) {
		return _apply(func, this, args || []);
	}

	/**
	 * Apply helper that allows specifying thisArg
	 * @private
	 */
	function _apply(func, thisArg, args) {
		return Promise.all(args).then(function(args) {
			return _applyDirect(func, thisArg, args);
		});
	}

	/**
	 * Apply helper that optimizes for small number of arguments
	 * @private
	 */
	function _applyDirect(func, thisArg, args) {
		var p = Promise._defer();
		args.push(createCallback(p._handler));
		func.apply(thisArg, args);
		return p;
	}

	/**
	 * Has the same behavior that {@link apply} has, with the difference that the
	 * arguments to the function are provided individually, while {@link apply} accepts
	 * a single array.
	 *
	 * @example
	 *    function sumSmallNumbers(x, y, callback) {
	 *		var result = x + y;
	 *		if(result < 10) {
	 *			callback(null, result);
	 *		} else {
	 *			callback(new Error("Calculation failed"));
	 *		}
	 *	}
	 *
	 *    // Logs '5'
	 *    nodefn.call(sumSmallNumbers, 2, 3).then(console.log, console.error);
	 *
	 *    // Logs 'Calculation failed'
	 *    nodefn.call(sumSmallNumbers, 5, 10).then(console.log, console.error);
	 *
	 * @param {function} func node-style function that will be called
	 * @param {...*} [args] arguments that will be forwarded to the function
	 * @returns {Promise} promise for the value func passes to its callback
	 */
	function call(func /*, args... */) {
		return _apply(func, this, slice.call(arguments, 1));
	}

	/**
	 * Takes a node-style function and returns new function that wraps the
	 * original and, instead of taking a callback, returns a promise. Also, it
	 * knows how to handle promises given as arguments, waiting for their
	 * resolution before executing.
	 *
	 * Upon execution, the orginal function is executed as well. If it passes
	 * a truthy value as the first argument to the callback, it will be
	 * interpreted as an error condition, and the promise will be rejected
	 * with it. Otherwise, the call is considered a resolution, and the promise
	 * is resolved with the callback's second argument.
	 *
	 * @example
	 *    var fs = require("fs"), nodefn = require("when/node/function");
	 *
	 *    var promiseRead = nodefn.lift(fs.readFile);
	 *
	 *    // The promise is resolved with the contents of the file if everything
	 *    // goes ok
	 *    promiseRead('exists.txt').then(console.log, console.error);
	 *
	 *    // And will be rejected if something doesn't work out
	 *    // (e.g. the files does not exist)
	 *    promiseRead('doesnt_exist.txt').then(console.log, console.error);
	 *
	 *
	 * @param {Function} func node-style function to be bound
	 * @param {...*} [args] arguments to be prepended for the new function
	 * @returns {Function} a promise-returning function
	 */
	function lift(func /*, args... */) {
		var args = slice.call(arguments, 1);
		return function() {
			return _apply(func, this, args.concat(slice.call(arguments)));
		};
	}

	/**
	 * Lift all the functions/methods on src
	 * @param {object|function} src source whose functions will be lifted
	 * @param {function?} combine optional function for customizing the lifting
	 *  process. It is passed dst, the lifted function, and the property name of
	 *  the original function on src.
	 * @param {(object|function)?} dst option destination host onto which to place lifted
	 *  functions. If not provided, liftAll returns a new object.
	 * @returns {*} If dst is provided, returns dst with lifted functions as
	 *  properties.  If dst not provided, returns a new object with lifted functions.
	 */
	function liftAll(src, combine, dst) {
		return _liftAll(lift, combine, dst, src);
	}

	/**
	 * Takes an object that responds to the resolver interface, and returns
	 * a function that will resolve or reject it depending on how it is called.
	 *
	 * @example
	 *	function callbackTakingFunction(callback) {
	 *		if(somethingWrongHappened) {
	 *			callback(error);
	 *		} else {
	 *			callback(null, interestingValue);
	 *		}
	 *	}
	 *
	 *	var when = require('when'), nodefn = require('when/node/function');
	 *
	 *	var deferred = when.defer();
	 *	callbackTakingFunction(nodefn.createCallback(deferred.resolver));
	 *
	 *	deferred.promise.then(function(interestingValue) {
	 *		// Use interestingValue
	 *	});
	 *
	 * @param {Resolver} resolver that will be 'attached' to the callback
	 * @returns {Function} a node-style callback function
	 */
	function createCallback(resolver) {
		return function(err, value) {
			if(err) {
				resolver.reject(err);
			} else if(arguments.length > 2) {
				resolver.resolve(slice.call(arguments, 1));
			} else {
				resolver.resolve(value);
			}
		};
	}

	/**
	 * Attaches a node-style callback to a promise, ensuring the callback is
	 * called for either fulfillment or rejection. Returns a promise with the same
	 * state as the passed-in promise.
	 *
	 * @example
	 *	var deferred = when.defer();
	 *
	 *	function callback(err, value) {
	 *		// Handle err or use value
	 *	}
	 *
	 *	bindCallback(deferred.promise, callback);
	 *
	 *	deferred.resolve('interesting value');
	 *
	 * @param {Promise} promise The promise to be attached to.
	 * @param {Function} callback The node-style callback to attach.
	 * @returns {Promise} A promise with the same state as the passed-in promise.
	 */
	function bindCallback(promise, callback) {
		promise = when(promise);

		if (callback) {
			promise.then(success, wrapped);
		}

		return promise;

		function success(value) {
			wrapped(null, value);
		}

		function wrapped(err, value) {
			setTimer(function () {
				callback(err, value);
			}, 0);
		}
	}

	/**
	 * Takes a node-style callback and returns new function that accepts a
	 * promise, calling the original callback when the promise is either
	 * fulfilled or rejected with the appropriate arguments.
	 *
	 * @example
	 *	var deferred = when.defer();
	 *
	 *	function callback(err, value) {
	 *		// Handle err or use value
	 *	}
	 *
	 *	var wrapped = liftCallback(callback);
	 *
	 *	// `wrapped` can now be passed around at will
	 *	wrapped(deferred.promise);
	 *
	 *	deferred.resolve('interesting value');
	 *
	 * @param {Function} callback The node-style callback to wrap.
	 * @returns {Function} The lifted, promise-accepting function.
	 */
	function liftCallback(callback) {
		return function(promise) {
			return bindCallback(promise, callback);
		};
	}
});

})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });




},{"./lib/liftAll":16,"./lib/timer":21,"./when":29}],24:[function(require,module,exports){
/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * parallel.js
 *
 * Run a set of task functions in parallel.  All tasks will
 * receive the same args
 *
 * @author Brian Cavalier
 * @author John Hann
 */

(function(define) {
define(function(require) {

	var when = require('./when');
	var all = when.Promise.all;
	var slice = Array.prototype.slice;

	/**
	 * Run array of tasks in parallel
	 * @param tasks {Array|Promise} array or promiseForArray of task functions
	 * @param [args] {*} arguments to be passed to all tasks
	 * @return {Promise} promise for array containing the
	 * result of each task in the array position corresponding
	 * to position of the task in the tasks array
	 */
	return function parallel(tasks /*, args... */) {
		return all(slice.call(arguments, 1)).then(function(args) {
			return when.map(tasks, function(task) {
				return task.apply(void 0, args);
			});
		});
	};

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });



},{"./when":29}],25:[function(require,module,exports){
/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * pipeline.js
 *
 * Run a set of task functions in sequence, passing the result
 * of the previous as an argument to the next.  Like a shell
 * pipeline, e.g. `cat file.txt | grep 'foo' | sed -e 's/foo/bar/g'
 *
 * @author Brian Cavalier
 * @author John Hann
 */

(function(define) {
define(function(require) {

	var when = require('./when');
	var all = when.Promise.all;
	var slice = Array.prototype.slice;

	/**
	 * Run array of tasks in a pipeline where the next
	 * tasks receives the result of the previous.  The first task
	 * will receive the initialArgs as its argument list.
	 * @param tasks {Array|Promise} array or promise for array of task functions
	 * @param [initialArgs...] {*} arguments to be passed to the first task
	 * @return {Promise} promise for return value of the final task
	 */
	return function pipeline(tasks /* initialArgs... */) {
		// Self-optimizing function to run first task with multiple
		// args using apply, but subsequence tasks via direct invocation
		var runTask = function(args, task) {
			runTask = function(arg, task) {
				return task(arg);
			};

			return task.apply(null, args);
		};

		return all(slice.call(arguments, 1)).then(function(args) {
			return when.reduce(tasks, function(arg, task) {
				return runTask(arg, task);
			}, args);
		});
	};

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });



},{"./when":29}],26:[function(require,module,exports){
/** @license MIT License (c) copyright 2012-2013 original author or authors */

/**
 * poll.js
 *
 * Helper that polls until cancelled or for a condition to become true.
 *
 * @author Scott Andrews
 */

(function (define) { 'use strict';
define(function(require) {

	var when, attempt, cancelable;

	when = require('./when');
	attempt = when['try'];
	cancelable = require('./cancelable');

	/**
	 * Periodically execute the work function on the msec delay. The result of
	 * the work may be verified by watching for a condition to become true. The
	 * returned deferred is cancellable if the polling needs to be cancelled
	 * externally before reaching a resolved state.
	 *
	 * The next vote is scheduled after the results of the current vote are
	 * verified and rejected.
	 *
	 * Polling may be terminated by the verifier returning a truthy value,
	 * invoking cancel() on the returned promise, or the work function returning
	 * a rejected promise.
	 *
	 * Usage:
	 *
	 * var count = 0;
	 * function doSomething() { return count++ }
	 *
	 * // poll until cancelled
	 * var p = poll(doSomething, 1000);
	 * ...
	 * p.cancel();
	 *
	 * // poll until condition is met
	 * poll(doSomething, 1000, function(result) { return result > 10 })
	 *     .then(function(result) { assert result == 10 });
	 *
	 * // delay first vote
	 * poll(doSomething, 1000, anyFunc, true);
	 *
	 * @param work {Function} function that is executed after every timeout
	 * @param interval {number|Function} timeout in milliseconds
	 * @param [verifier] {Function} function to evaluate the result of the vote.
	 *     May return a {Promise} or a {Boolean}. Rejecting the promise or a
	 *     falsey value will schedule the next vote.
	 * @param [delayInitialWork] {boolean} if truthy, the first vote is scheduled
	 *     instead of immediate
	 *
	 * @returns {Promise}
	 */
	return function poll(work, interval, verifier, delayInitialWork) {
		var deferred, canceled, reject;

		canceled = false;
		deferred = cancelable(when.defer(), function () { canceled = true; });
		reject = deferred.reject;

		verifier = verifier || function () { return false; };

		if (typeof interval !== 'function') {
			interval = (function (interval) {
				return function () { return when().delay(interval); };
			})(interval);
		}

		function certify(result) {
			deferred.resolve(result);
		}

		function schedule(result) {
			attempt(interval).then(vote, reject);
			if (result !== void 0) {
				deferred.notify(result);
			}
		}

		function vote() {
			if (canceled) { return; }
			when(work(),
				function (result) {
					when(verifier(result),
						function (verification) {
							return verification ? certify(result) : schedule(result);
						},
						function () { schedule(result); }
					);
				},
				reject
			);
		}

		if (delayInitialWork) {
			schedule();
		} else {
			// if work() is blocking, vote will also block
			vote();
		}

		// make the promise cancelable
		deferred.promise = Object.create(deferred.promise);
		deferred.promise.cancel = deferred.cancel;

		return deferred.promise;
	};

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./cancelable":3,"./when":29}],27:[function(require,module,exports){
/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * sequence.js
 *
 * Run a set of task functions in sequence.  All tasks will
 * receive the same args.
 *
 * @author Brian Cavalier
 * @author John Hann
 */

(function(define) {
define(function(require) {

	var when = require('./when');
	var all = when.Promise.all;
	var slice = Array.prototype.slice;

	/**
	 * Run array of tasks in sequence with no overlap
	 * @param tasks {Array|Promise} array or promiseForArray of task functions
	 * @param [args] {*} arguments to be passed to all tasks
	 * @return {Promise} promise for an array containing
	 * the result of each task in the array position corresponding
	 * to position of the task in the tasks array
	 */
	return function sequence(tasks /*, args... */) {
		var results = [];

		return all(slice.call(arguments, 1)).then(function(args) {
			return when.reduce(tasks, function(results, task) {
				return when(task.apply(void 0, args), addResult);
			}, results);
		});

		function addResult(result) {
			results.push(result);
			return results;
		}
	};

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });



},{"./when":29}],28:[function(require,module,exports){
/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * timeout.js
 *
 * Helper that returns a promise that rejects after a specified timeout,
 * if not explicitly resolved or rejected before that.
 *
 * @author Brian Cavalier
 * @author John Hann
 */

(function(define) {
define(function(require) {

	var resolve = require('./when').resolve;

    /**
	 * @deprecated Use when(trigger).timeout(ms)
     */
    return function timeout(msec, trigger) {
		return resolve(trigger).timeout(msec);
    };
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });



},{"./when":29}],29:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */

/**
 * A lightweight CommonJS Promises/A and when() implementation
 * when is part of the cujoJS family of libraries (http://cujojs.com/)
 * @author Brian Cavalier
 * @author John Hann
 * @version 3.0.0
 */
(function(define) { 'use strict';
define(function (require) {

	var timer = require('./lib/timer');
	var timed = require('./lib/timed');
	var array = require('./lib/array');
	var flow = require('./lib/flow');
	var inspect = require('./lib/inspect');
	var generate = require('./lib/iterate');
	var progress = require('./lib/progress');
	var withThis = require('./lib/with');

	var Promise = require('./lib/Promise');
	Promise = [array, flow, generate, progress, inspect, withThis]
		.reduceRight(function(Promise, feature) {
			return feature(Promise);
		}, timed(timer.set, timer.clear, Promise));

	var resolve = Promise.resolve;
	var slice = Array.prototype.slice;

	// Public API

	when.promise     = promise;              // Create a pending promise
	when.resolve     = Promise.resolve;      // Create a resolved promise
	when.reject      = Promise.reject;       // Create a rejected promise

	when.lift        = lift;                 // lift a function to return promises
	when['try']      = tryCall;              // call a function and return a promise
	when.attempt     = tryCall;              // alias for when.try

	when.iterate     = Promise.iterate;      // Generate a stream of promises
	when.unfold      = Promise.unfold;       // Generate a stream of promises

	when.join        = join;                 // Join 2 or more promises

	when.all         = all;                  // Resolve a list of promises
	when.settle      = settle;               // Settle a list of promises

	when.any         = lift(Promise.any);    // One-winner race
	when.some        = lift(Promise.some);   // Multi-winner race

	when.map         = map;                  // Array.map() for promises
	when.reduce      = reduce;               // Array.reduce() for promises
	when.reduceRight = reduceRight;          // Array.reduceRight() for promises

	when.isPromiseLike = isPromiseLike;      // Is something promise-like, aka thenable

	when.Promise     = Promise;              // Promise constructor
	when.defer       = defer;                // Create a {promise, resolve, reject} tuple

	/**
	 * When x, which may be a promise, thenable, or non-promise value,
	 *
	 * @param {*} x
	 * @param {function?} onFulfilled callback to be called when x is
	 *   successfully fulfilled.  If promiseOrValue is an immediate value, callback
	 *   will be invoked immediately.
	 * @param {function?} onRejected callback to be called when x is
	 *   rejected.
	 * @param {function?} onProgress callback to be called when progress updates
	 *   are issued for x.
	 * @returns {Promise} a new promise that will fulfill with the return
	 *   value of callback or errback or the completion value of promiseOrValue if
	 *   callback and/or errback is not supplied.
	 */
	function when(x, onFulfilled, onRejected, onProgress) {
		var p = resolve(x);
		return arguments.length < 2 ? p : p.then(onFulfilled, onRejected, onProgress);
	}

	/**
	 * Creates a new promise whose fate is determined by resolver.
	 * @param {function} resolver function(resolve, reject, notify)
	 * @returns {Promise} promise whose fate is determine by resolver
	 */
	function promise(resolver) {
		return new Promise(resolver);
	}

	/**
	 * Lift the supplied function, creating a version of f that returns
	 * promises, and accepts promises as arguments.
	 * @param {function} f
	 * @returns {Function} version of f that returns promises
	 */
	function lift(f) {
		return function() {
			return _apply(f, this, slice.call(arguments));
		};
	}

	/**
	 * Call f in a future turn, with the supplied args, and return a promise
	 * for the result.
	 * @param {function} f
	 * @returns {Promise}
	 */
	function tryCall(f /*, args... */) {
		/*jshint validthis:true */
		return _apply(f, this, slice.call(arguments, 1));
	}

	/**
	 * try/lift helper that allows specifying thisArg
	 * @private
	 */
	function _apply(func, thisArg, args) {
		return Promise.all(args).then(function(args) {
			return func.apply(thisArg, args);
		});
	}

	/**
	 * Creates a {promise, resolver} pair, either or both of which
	 * may be given out safely to consumers.
	 * @return {{promise: Promise, resolve: function, reject: function, notify: function}}
	 */
	function defer() {
		return new Deferred();
	}

	function Deferred() {
		var p = Promise._defer();

		function resolve(x) { p._handler.resolve(x); }
		function reject(x) { p._handler.reject(x); }
		function notify(x) { p._handler.notify(x); }

		this.promise = p;
		this.resolve = resolve;
		this.reject = reject;
		this.notify = notify;
		this.resolver = { resolve: resolve, reject: reject, notify: notify };
	}

	/**
	 * Determines if x is promise-like, i.e. a thenable object
	 * NOTE: Will return true for *any thenable object*, and isn't truly
	 * safe, since it may attempt to access the `then` property of x (i.e.
	 *  clever/malicious getters may do weird things)
	 * @param {*} x anything
	 * @returns {boolean} true if x is promise-like
	 */
	function isPromiseLike(x) {
		return x && typeof x.then === 'function';
	}

	/**
	 * Return a promise that will resolve only once all the supplied arguments
	 * have resolved. The resolution value of the returned promise will be an array
	 * containing the resolution values of each of the arguments.
	 * @param {...*} arguments may be a mix of promises and values
	 * @returns {Promise}
	 */
	function join(/* ...promises */) {
		return Promise.all(arguments);
	}

	/**
	 * Return a promise that will fulfill once all input promises have
	 * fulfilled, or reject when any one input promise rejects.
	 * @param {array|Promise} promises array (or promise for an array) of promises
	 * @returns {Promise}
	 */
	function all(promises) {
		return when(promises, Promise.all);
	}

	/**
	 * Return a promise that will always fulfill with an array containing
	 * the outcome states of all input promises.  The returned promise
	 * will only reject if `promises` itself is a rejected promise.
	 * @param {array|Promise} promises array (or promise for an array) of promises
	 * @returns {Promise}
	 */
	function settle(promises) {
		return when(promises, Promise.settle);
	}

	/**
	 * Promise-aware array map function, similar to `Array.prototype.map()`,
	 * but input array may contain promises or values.
	 * @param {Array|Promise} promises array of anything, may contain promises and values
	 * @param {function} mapFunc map function which may return a promise or value
	 * @returns {Promise} promise that will fulfill with an array of mapped values
	 *  or reject if any input promise rejects.
	 */
	function map(promises, mapFunc) {
		return when(promises, function(promises) {
			return Promise.map(promises, mapFunc);
		});
	}

	/**
	 * Traditional reduce function, similar to `Array.prototype.reduce()`, but
	 * input may contain promises and/or values, and reduceFunc
	 * may return either a value or a promise, *and* initialValue may
	 * be a promise for the starting value.
	 *
	 * @param {Array|Promise} promises array or promise for an array of anything,
	 *      may contain a mix of promises and values.
	 * @param {function} f reduce function reduce(currentValue, nextValue, index)
	 * @returns {Promise} that will resolve to the final reduced value
	 */
	function reduce(promises, f /*, initialValue */) {
		/*jshint unused:false*/
		var args = slice.call(arguments, 1);
		return when(promises, function(array) {
			args.unshift(array);
			return Promise.reduce.apply(Promise, args);
		});
	}

	/**
	 * Traditional reduce function, similar to `Array.prototype.reduceRight()`, but
	 * input may contain promises and/or values, and reduceFunc
	 * may return either a value or a promise, *and* initialValue may
	 * be a promise for the starting value.
	 *
	 * @param {Array|Promise} promises array or promise for an array of anything,
	 *      may contain a mix of promises and values.
	 * @param {function} f reduce function reduce(currentValue, nextValue, index)
	 * @returns {Promise} that will resolve to the final reduced value
	 */
	function reduceRight(promises, f /*, initialValue */) {
		/*jshint unused:false*/
		var args = slice.call(arguments, 1);
		return when(promises, function(array) {
			args.unshift(array);
			return Promise.reduceRight.apply(Promise, args);
		});
	}

	return when;
});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./lib/Promise":8,"./lib/array":10,"./lib/flow":13,"./lib/inspect":14,"./lib/iterate":15,"./lib/progress":18,"./lib/timed":20,"./lib/timer":21,"./lib/with":22}]},{},[1])
(1)
});
;