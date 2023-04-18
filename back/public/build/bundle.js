
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35731/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind$1(component, name, callback, value) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            if (value === undefined) {
                callback(component.$$.ctx[index]);
            }
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var bind = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

    // utils is a library of generic helper functions non-specific to axios

    var toString = Object.prototype.toString;

    // eslint-disable-next-line func-names
    var kindOf = (function(cache) {
      // eslint-disable-next-line func-names
      return function(thing) {
        var str = toString.call(thing);
        return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
      };
    })(Object.create(null));

    function kindOfTest(type) {
      type = type.toLowerCase();
      return function isKindOf(thing) {
        return kindOf(thing) === type;
      };
    }

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray(val) {
      return Array.isArray(val);
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is a Buffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @function
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    var isArrayBuffer = kindOfTest('ArrayBuffer');


    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a plain Object
     *
     * @param {Object} val The value to test
     * @return {boolean} True if value is a plain Object, otherwise false
     */
    function isPlainObject(val) {
      if (kindOf(val) !== 'object') {
        return false;
      }

      var prototype = Object.getPrototypeOf(val);
      return prototype === null || prototype === Object.prototype;
    }

    /**
     * Determine if a value is a Date
     *
     * @function
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    var isDate = kindOfTest('Date');

    /**
     * Determine if a value is a File
     *
     * @function
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    var isFile = kindOfTest('File');

    /**
     * Determine if a value is a Blob
     *
     * @function
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    var isBlob = kindOfTest('Blob');

    /**
     * Determine if a value is a FileList
     *
     * @function
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    var isFileList = kindOfTest('FileList');

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction(val) {
      return toString.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} thing The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(thing) {
      var pattern = '[object FormData]';
      return thing && (
        (typeof FormData === 'function' && thing instanceof FormData) ||
        toString.call(thing) === pattern ||
        (isFunction(thing.toString) && thing.toString() === pattern)
      );
    }

    /**
     * Determine if a value is a URLSearchParams object
     * @function
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    var isURLSearchParams = kindOfTest('URLSearchParams');

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     */
    function isStandardBrowserEnv() {
      if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                               navigator.product === 'NativeScript' ||
                                               navigator.product === 'NS')) {
        return false;
      }
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (isPlainObject(result[key]) && isPlainObject(val)) {
          result[key] = merge(result[key], val);
        } else if (isPlainObject(val)) {
          result[key] = merge({}, val);
        } else if (isArray(val)) {
          result[key] = val.slice();
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     * @return {string} content value without BOM
     */
    function stripBOM(content) {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    }

    /**
     * Inherit the prototype methods from one constructor into another
     * @param {function} constructor
     * @param {function} superConstructor
     * @param {object} [props]
     * @param {object} [descriptors]
     */

    function inherits(constructor, superConstructor, props, descriptors) {
      constructor.prototype = Object.create(superConstructor.prototype, descriptors);
      constructor.prototype.constructor = constructor;
      props && Object.assign(constructor.prototype, props);
    }

    /**
     * Resolve object with deep prototype chain to a flat object
     * @param {Object} sourceObj source object
     * @param {Object} [destObj]
     * @param {Function} [filter]
     * @returns {Object}
     */

    function toFlatObject(sourceObj, destObj, filter) {
      var props;
      var i;
      var prop;
      var merged = {};

      destObj = destObj || {};

      do {
        props = Object.getOwnPropertyNames(sourceObj);
        i = props.length;
        while (i-- > 0) {
          prop = props[i];
          if (!merged[prop]) {
            destObj[prop] = sourceObj[prop];
            merged[prop] = true;
          }
        }
        sourceObj = Object.getPrototypeOf(sourceObj);
      } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

      return destObj;
    }

    /*
     * determines whether a string ends with the characters of a specified string
     * @param {String} str
     * @param {String} searchString
     * @param {Number} [position= 0]
     * @returns {boolean}
     */
    function endsWith(str, searchString, position) {
      str = String(str);
      if (position === undefined || position > str.length) {
        position = str.length;
      }
      position -= searchString.length;
      var lastIndex = str.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
    }


    /**
     * Returns new array from array like object
     * @param {*} [thing]
     * @returns {Array}
     */
    function toArray(thing) {
      if (!thing) return null;
      var i = thing.length;
      if (isUndefined(i)) return null;
      var arr = new Array(i);
      while (i-- > 0) {
        arr[i] = thing[i];
      }
      return arr;
    }

    // eslint-disable-next-line func-names
    var isTypedArray = (function(TypedArray) {
      // eslint-disable-next-line func-names
      return function(thing) {
        return TypedArray && thing instanceof TypedArray;
      };
    })(typeof Uint8Array !== 'undefined' && Object.getPrototypeOf(Uint8Array));

    var utils = {
      isArray: isArray,
      isArrayBuffer: isArrayBuffer,
      isBuffer: isBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject,
      isPlainObject: isPlainObject,
      isUndefined: isUndefined,
      isDate: isDate,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      extend: extend,
      trim: trim,
      stripBOM: stripBOM,
      inherits: inherits,
      toFlatObject: toFlatObject,
      kindOf: kindOf,
      kindOfTest: kindOfTest,
      endsWith: endsWith,
      toArray: toArray,
      isTypedArray: isTypedArray,
      isFileList: isFileList
    };

    function encode(val) {
      return encodeURIComponent(val).
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    var buildURL = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils.isArray(val)) {
            key = key + '[]';
          } else {
            val = [val];
          }

          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

    function InterceptorManager() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected,
        synchronous: options ? options.synchronous : false,
        runWhen: options ? options.runWhen : null
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    var InterceptorManager_1 = InterceptorManager;

    var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [config] The config.
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    function AxiosError(message, code, config, request, response) {
      Error.call(this);
      this.message = message;
      this.name = 'AxiosError';
      code && (this.code = code);
      config && (this.config = config);
      request && (this.request = request);
      response && (this.response = response);
    }

    utils.inherits(AxiosError, Error, {
      toJSON: function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: this.config,
          code: this.code,
          status: this.response && this.response.status ? this.response.status : null
        };
      }
    });

    var prototype = AxiosError.prototype;
    var descriptors = {};

    [
      'ERR_BAD_OPTION_VALUE',
      'ERR_BAD_OPTION',
      'ECONNABORTED',
      'ETIMEDOUT',
      'ERR_NETWORK',
      'ERR_FR_TOO_MANY_REDIRECTS',
      'ERR_DEPRECATED',
      'ERR_BAD_RESPONSE',
      'ERR_BAD_REQUEST',
      'ERR_CANCELED'
    // eslint-disable-next-line func-names
    ].forEach(function(code) {
      descriptors[code] = {value: code};
    });

    Object.defineProperties(AxiosError, descriptors);
    Object.defineProperty(prototype, 'isAxiosError', {value: true});

    // eslint-disable-next-line func-names
    AxiosError.from = function(error, code, config, request, response, customProps) {
      var axiosError = Object.create(prototype);

      utils.toFlatObject(error, axiosError, function filter(obj) {
        return obj !== Error.prototype;
      });

      AxiosError.call(axiosError, error.message, code, config, request, response);

      axiosError.name = error.name;

      customProps && Object.assign(axiosError, customProps);

      return axiosError;
    };

    var AxiosError_1 = AxiosError;

    var transitional = {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    };

    /**
     * Convert a data object to FormData
     * @param {Object} obj
     * @param {?Object} [formData]
     * @returns {Object}
     **/

    function toFormData(obj, formData) {
      // eslint-disable-next-line no-param-reassign
      formData = formData || new FormData();

      var stack = [];

      function convertValue(value) {
        if (value === null) return '';

        if (utils.isDate(value)) {
          return value.toISOString();
        }

        if (utils.isArrayBuffer(value) || utils.isTypedArray(value)) {
          return typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
        }

        return value;
      }

      function build(data, parentKey) {
        if (utils.isPlainObject(data) || utils.isArray(data)) {
          if (stack.indexOf(data) !== -1) {
            throw Error('Circular reference detected in ' + parentKey);
          }

          stack.push(data);

          utils.forEach(data, function each(value, key) {
            if (utils.isUndefined(value)) return;
            var fullKey = parentKey ? parentKey + '.' + key : key;
            var arr;

            if (value && !parentKey && typeof value === 'object') {
              if (utils.endsWith(key, '{}')) {
                // eslint-disable-next-line no-param-reassign
                value = JSON.stringify(value);
              } else if (utils.endsWith(key, '[]') && (arr = utils.toArray(value))) {
                // eslint-disable-next-line func-names
                arr.forEach(function(el) {
                  !utils.isUndefined(el) && formData.append(fullKey, convertValue(el));
                });
                return;
              }
            }

            build(value, fullKey);
          });

          stack.pop();
        } else {
          formData.append(parentKey, convertValue(data));
        }
      }

      build(obj);

      return formData;
    }

    var toFormData_1 = toFormData;

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    var settle = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(new AxiosError_1(
          'Request failed with status code ' + response.status,
          [AxiosError_1.ERR_BAD_REQUEST, AxiosError_1.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
          response.config,
          response.request,
          response
        ));
      }
    };

    var cookies = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
        (function standardBrowserEnv() {
          return {
            write: function write(name, value, expires, path, domain, secure) {
              var cookie = [];
              cookie.push(name + '=' + encodeURIComponent(value));

              if (utils.isNumber(expires)) {
                cookie.push('expires=' + new Date(expires).toGMTString());
              }

              if (utils.isString(path)) {
                cookie.push('path=' + path);
              }

              if (utils.isString(domain)) {
                cookie.push('domain=' + domain);
              }

              if (secure === true) {
                cookie.push('secure');
              }

              document.cookie = cookie.join('; ');
            },

            read: function read(name) {
              var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
              return (match ? decodeURIComponent(match[3]) : null);
            },

            remove: function remove(name) {
              this.write(name, '', Date.now() - 86400000);
            }
          };
        })() :

      // Non standard browser env (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return {
            write: function write() {},
            read: function read() { return null; },
            remove: function remove() {}
          };
        })()
    );

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    var isAbsoluteURL = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
    };

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    var combineURLs = function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    };

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     * @returns {string} The combined full path
     */
    var buildFullPath = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };

    // Headers whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    var ignoreDuplicateOf = [
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ];

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) { return parsed; }

      utils.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));

        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === 'set-cookie') {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
        }
      });

      return parsed;
    };

    var isURLSameOrigin = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
        (function standardBrowserEnv() {
          var msie = /(msie|trident)/i.test(navigator.userAgent);
          var urlParsingNode = document.createElement('a');
          var originURL;

          /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
          function resolveURL(url) {
            var href = url;

            if (msie) {
            // IE needs attribute set twice to normalize properties
              urlParsingNode.setAttribute('href', href);
              href = urlParsingNode.href;
            }

            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
              href: urlParsingNode.href,
              protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
              host: urlParsingNode.host,
              search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
              hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
              hostname: urlParsingNode.hostname,
              port: urlParsingNode.port,
              pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                urlParsingNode.pathname :
                '/' + urlParsingNode.pathname
            };
          }

          originURL = resolveURL(window.location.href);

          /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
          return function isURLSameOrigin(requestURL) {
            var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
            return (parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host);
          };
        })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return function isURLSameOrigin() {
            return true;
          };
        })()
    );

    /**
     * A `CanceledError` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function CanceledError(message) {
      // eslint-disable-next-line no-eq-null,eqeqeq
      AxiosError_1.call(this, message == null ? 'canceled' : message, AxiosError_1.ERR_CANCELED);
      this.name = 'CanceledError';
    }

    utils.inherits(CanceledError, AxiosError_1, {
      __CANCEL__: true
    });

    var CanceledError_1 = CanceledError;

    var parseProtocol = function parseProtocol(url) {
      var match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
      return match && match[1] || '';
    };

    var xhr = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;
        var responseType = config.responseType;
        var onCanceled;
        function done() {
          if (config.cancelToken) {
            config.cancelToken.unsubscribe(onCanceled);
          }

          if (config.signal) {
            config.signal.removeEventListener('abort', onCanceled);
          }
        }

        if (utils.isFormData(requestData) && utils.isStandardBrowserEnv()) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          var username = config.auth.username || '';
          var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
          requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        var fullPath = buildFullPath(config.baseURL, config.url);

        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        function onloadend() {
          if (!request) {
            return;
          }
          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
            request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config: config,
            request: request
          };

          settle(function _resolve(value) {
            resolve(value);
            done();
          }, function _reject(err) {
            reject(err);
            done();
          }, response);

          // Clean up request
          request = null;
        }

        if ('onloadend' in request) {
          // Use onloadend if available
          request.onloadend = onloadend;
        } else {
          // Listen for ready state to emulate onloadend
          request.onreadystatechange = function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }

            // The request errored out and we didn't get a response, this will be
            // handled by onerror instead
            // With one exception: request that using file: protocol, most browsers
            // will return status as 0 even though it's a successful request
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
              return;
            }
            // readystate handler is calling before onerror or ontimeout handlers,
            // so we should call onloadend on the next 'tick'
            setTimeout(onloadend);
          };
        }

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(new AxiosError_1('Request aborted', AxiosError_1.ECONNABORTED, config, request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(new AxiosError_1('Network Error', AxiosError_1.ERR_NETWORK, config, request, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
          var transitional$1 = config.transitional || transitional;
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(new AxiosError_1(
            timeoutErrorMessage,
            transitional$1.clarifyTimeoutError ? AxiosError_1.ETIMEDOUT : AxiosError_1.ECONNABORTED,
            config,
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (utils.isStandardBrowserEnv()) {
          // Add xsrf header
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
            cookies.read(config.xsrfCookieName) :
            undefined;

          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
              // Remove Content-Type if data is undefined
              delete requestHeaders[key];
            } else {
              // Otherwise add header to the request
              request.setRequestHeader(key, val);
            }
          });
        }

        // Add withCredentials to request if needed
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (responseType && responseType !== 'json') {
          request.responseType = config.responseType;
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', config.onUploadProgress);
        }

        if (config.cancelToken || config.signal) {
          // Handle cancellation
          // eslint-disable-next-line func-names
          onCanceled = function(cancel) {
            if (!request) {
              return;
            }
            reject(!cancel || (cancel && cancel.type) ? new CanceledError_1() : cancel);
            request.abort();
            request = null;
          };

          config.cancelToken && config.cancelToken.subscribe(onCanceled);
          if (config.signal) {
            config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
          }
        }

        if (!requestData) {
          requestData = null;
        }

        var protocol = parseProtocol(fullPath);

        if (protocol && [ 'http', 'https', 'file' ].indexOf(protocol) === -1) {
          reject(new AxiosError_1('Unsupported protocol ' + protocol + ':', AxiosError_1.ERR_BAD_REQUEST, config));
          return;
        }


        // Send the request
        request.send(requestData);
      });
    };

    // eslint-disable-next-line strict
    var _null = null;

    var DEFAULT_CONTENT_TYPE = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
        headers['Content-Type'] = value;
      }
    }

    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = xhr;
      } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
        // For node use HTTP adapter
        adapter = xhr;
      }
      return adapter;
    }

    function stringifySafely(rawValue, parser, encoder) {
      if (utils.isString(rawValue)) {
        try {
          (parser || JSON.parse)(rawValue);
          return utils.trim(rawValue);
        } catch (e) {
          if (e.name !== 'SyntaxError') {
            throw e;
          }
        }
      }

      return (encoder || JSON.stringify)(rawValue);
    }

    var defaults = {

      transitional: transitional,

      adapter: getDefaultAdapter(),

      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');

        if (utils.isFormData(data) ||
          utils.isArrayBuffer(data) ||
          utils.isBuffer(data) ||
          utils.isStream(data) ||
          utils.isFile(data) ||
          utils.isBlob(data)
        ) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
          return data.toString();
        }

        var isObjectPayload = utils.isObject(data);
        var contentType = headers && headers['Content-Type'];

        var isFileList;

        if ((isFileList = utils.isFileList(data)) || (isObjectPayload && contentType === 'multipart/form-data')) {
          var _FormData = this.env && this.env.FormData;
          return toFormData_1(isFileList ? {'files[]': data} : data, _FormData && new _FormData());
        } else if (isObjectPayload || contentType === 'application/json') {
          setContentTypeIfUnset(headers, 'application/json');
          return stringifySafely(data);
        }

        return data;
      }],

      transformResponse: [function transformResponse(data) {
        var transitional = this.transitional || defaults.transitional;
        var silentJSONParsing = transitional && transitional.silentJSONParsing;
        var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
        var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

        if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
          try {
            return JSON.parse(data);
          } catch (e) {
            if (strictJSONParsing) {
              if (e.name === 'SyntaxError') {
                throw AxiosError_1.from(e, AxiosError_1.ERR_BAD_RESPONSE, this, null, this.response);
              }
              throw e;
            }
          }
        }

        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,
      maxBodyLength: -1,

      env: {
        FormData: _null
      },

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      },

      headers: {
        common: {
          'Accept': 'application/json, text/plain, */*'
        }
      }
    };

    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults_1 = defaults;

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData = function transformData(data, headers, fns) {
      var context = this || defaults_1;
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn.call(context, data, headers);
      });

      return data;
    };

    var isCancel = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

    /**
     * Throws a `CanceledError` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }

      if (config.signal && config.signal.aborted) {
        throw new CanceledError_1();
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    var dispatchRequest = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData.call(
        config,
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
      );

      utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults_1.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData.call(
          config,
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData.call(
              config,
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     * @returns {Object} New object resulting from merging config2 to config1
     */
    var mergeConfig = function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      var config = {};

      function getMergedValue(target, source) {
        if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
          return utils.merge(target, source);
        } else if (utils.isPlainObject(source)) {
          return utils.merge({}, source);
        } else if (utils.isArray(source)) {
          return source.slice();
        }
        return source;
      }

      // eslint-disable-next-line consistent-return
      function mergeDeepProperties(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(config1[prop], config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          return getMergedValue(undefined, config1[prop]);
        }
      }

      // eslint-disable-next-line consistent-return
      function valueFromConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(undefined, config2[prop]);
        }
      }

      // eslint-disable-next-line consistent-return
      function defaultToConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          return getMergedValue(undefined, config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          return getMergedValue(undefined, config1[prop]);
        }
      }

      // eslint-disable-next-line consistent-return
      function mergeDirectKeys(prop) {
        if (prop in config2) {
          return getMergedValue(config1[prop], config2[prop]);
        } else if (prop in config1) {
          return getMergedValue(undefined, config1[prop]);
        }
      }

      var mergeMap = {
        'url': valueFromConfig2,
        'method': valueFromConfig2,
        'data': valueFromConfig2,
        'baseURL': defaultToConfig2,
        'transformRequest': defaultToConfig2,
        'transformResponse': defaultToConfig2,
        'paramsSerializer': defaultToConfig2,
        'timeout': defaultToConfig2,
        'timeoutMessage': defaultToConfig2,
        'withCredentials': defaultToConfig2,
        'adapter': defaultToConfig2,
        'responseType': defaultToConfig2,
        'xsrfCookieName': defaultToConfig2,
        'xsrfHeaderName': defaultToConfig2,
        'onUploadProgress': defaultToConfig2,
        'onDownloadProgress': defaultToConfig2,
        'decompress': defaultToConfig2,
        'maxContentLength': defaultToConfig2,
        'maxBodyLength': defaultToConfig2,
        'beforeRedirect': defaultToConfig2,
        'transport': defaultToConfig2,
        'httpAgent': defaultToConfig2,
        'httpsAgent': defaultToConfig2,
        'cancelToken': defaultToConfig2,
        'socketPath': defaultToConfig2,
        'responseEncoding': defaultToConfig2,
        'validateStatus': mergeDirectKeys
      };

      utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
        var merge = mergeMap[prop] || mergeDeepProperties;
        var configValue = merge(prop);
        (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
      });

      return config;
    };

    var data = {
      "version": "0.27.2"
    };

    var VERSION = data.version;


    var validators$1 = {};

    // eslint-disable-next-line func-names
    ['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
      validators$1[type] = function validator(thing) {
        return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
      };
    });

    var deprecatedWarnings = {};

    /**
     * Transitional option validator
     * @param {function|boolean?} validator - set to false if the transitional option has been removed
     * @param {string?} version - deprecated version / removed since version
     * @param {string?} message - some message with additional info
     * @returns {function}
     */
    validators$1.transitional = function transitional(validator, version, message) {
      function formatMessage(opt, desc) {
        return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
      }

      // eslint-disable-next-line func-names
      return function(value, opt, opts) {
        if (validator === false) {
          throw new AxiosError_1(
            formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
            AxiosError_1.ERR_DEPRECATED
          );
        }

        if (version && !deprecatedWarnings[opt]) {
          deprecatedWarnings[opt] = true;
          // eslint-disable-next-line no-console
          console.warn(
            formatMessage(
              opt,
              ' has been deprecated since v' + version + ' and will be removed in the near future'
            )
          );
        }

        return validator ? validator(value, opt, opts) : true;
      };
    };

    /**
     * Assert object's properties type
     * @param {object} options
     * @param {object} schema
     * @param {boolean?} allowUnknown
     */

    function assertOptions(options, schema, allowUnknown) {
      if (typeof options !== 'object') {
        throw new AxiosError_1('options must be an object', AxiosError_1.ERR_BAD_OPTION_VALUE);
      }
      var keys = Object.keys(options);
      var i = keys.length;
      while (i-- > 0) {
        var opt = keys[i];
        var validator = schema[opt];
        if (validator) {
          var value = options[opt];
          var result = value === undefined || validator(value, opt, options);
          if (result !== true) {
            throw new AxiosError_1('option ' + opt + ' must be ' + result, AxiosError_1.ERR_BAD_OPTION_VALUE);
          }
          continue;
        }
        if (allowUnknown !== true) {
          throw new AxiosError_1('Unknown option ' + opt, AxiosError_1.ERR_BAD_OPTION);
        }
      }
    }

    var validator = {
      assertOptions: assertOptions,
      validators: validators$1
    };

    var validators = validator.validators;
    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager_1(),
        response: new InterceptorManager_1()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios.prototype.request = function request(configOrUrl, config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof configOrUrl === 'string') {
        config = config || {};
        config.url = configOrUrl;
      } else {
        config = configOrUrl || {};
      }

      config = mergeConfig(this.defaults, config);

      // Set config.method
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = 'get';
      }

      var transitional = config.transitional;

      if (transitional !== undefined) {
        validator.assertOptions(transitional, {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean)
        }, false);
      }

      // filter out skipped interceptors
      var requestInterceptorChain = [];
      var synchronousRequestInterceptors = true;
      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
          return;
        }

        synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

        requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      var responseInterceptorChain = [];
      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
      });

      var promise;

      if (!synchronousRequestInterceptors) {
        var chain = [dispatchRequest, undefined];

        Array.prototype.unshift.apply(chain, requestInterceptorChain);
        chain = chain.concat(responseInterceptorChain);

        promise = Promise.resolve(config);
        while (chain.length) {
          promise = promise.then(chain.shift(), chain.shift());
        }

        return promise;
      }


      var newConfig = config;
      while (requestInterceptorChain.length) {
        var onFulfilled = requestInterceptorChain.shift();
        var onRejected = requestInterceptorChain.shift();
        try {
          newConfig = onFulfilled(newConfig);
        } catch (error) {
          onRejected(error);
          break;
        }
      }

      try {
        promise = dispatchRequest(newConfig);
      } catch (error) {
        return Promise.reject(error);
      }

      while (responseInterceptorChain.length) {
        promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
      }

      return promise;
    };

    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      var fullPath = buildFullPath(config.baseURL, config.url);
      return buildURL(fullPath, config.params, config.paramsSerializer);
    };

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: (config || {}).data
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/

      function generateHTTPMethod(isForm) {
        return function httpMethod(url, data, config) {
          return this.request(mergeConfig(config || {}, {
            method: method,
            headers: isForm ? {
              'Content-Type': 'multipart/form-data'
            } : {},
            url: url,
            data: data
          }));
        };
      }

      Axios.prototype[method] = generateHTTPMethod();

      Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
    });

    var Axios_1 = Axios;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;

      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;

      // eslint-disable-next-line func-names
      this.promise.then(function(cancel) {
        if (!token._listeners) return;

        var i;
        var l = token._listeners.length;

        for (i = 0; i < l; i++) {
          token._listeners[i](cancel);
        }
        token._listeners = null;
      });

      // eslint-disable-next-line func-names
      this.promise.then = function(onfulfilled) {
        var _resolve;
        // eslint-disable-next-line func-names
        var promise = new Promise(function(resolve) {
          token.subscribe(resolve);
          _resolve = resolve;
        }).then(onfulfilled);

        promise.cancel = function reject() {
          token.unsubscribe(_resolve);
        };

        return promise;
      };

      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new CanceledError_1(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `CanceledError` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Subscribe to the cancel signal
     */

    CancelToken.prototype.subscribe = function subscribe(listener) {
      if (this.reason) {
        listener(this.reason);
        return;
      }

      if (this._listeners) {
        this._listeners.push(listener);
      } else {
        this._listeners = [listener];
      }
    };

    /**
     * Unsubscribe from the cancel signal
     */

    CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
      if (!this._listeners) {
        return;
      }
      var index = this._listeners.indexOf(listener);
      if (index !== -1) {
        this._listeners.splice(index, 1);
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    var CancelToken_1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    var spread = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

    /**
     * Determines whether the payload is an error thrown by Axios
     *
     * @param {*} payload The value to test
     * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
     */
    var isAxiosError = function isAxiosError(payload) {
      return utils.isObject(payload) && (payload.isAxiosError === true);
    };

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios_1(defaultConfig);
      var instance = bind(Axios_1.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios_1.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      // Factory for creating new instances
      instance.create = function create(instanceConfig) {
        return createInstance(mergeConfig(defaultConfig, instanceConfig));
      };

      return instance;
    }

    // Create the default instance to be exported
    var axios$1 = createInstance(defaults_1);

    // Expose Axios class to allow class inheritance
    axios$1.Axios = Axios_1;

    // Expose Cancel & CancelToken
    axios$1.CanceledError = CanceledError_1;
    axios$1.CancelToken = CancelToken_1;
    axios$1.isCancel = isCancel;
    axios$1.VERSION = data.version;
    axios$1.toFormData = toFormData_1;

    // Expose AxiosError class
    axios$1.AxiosError = AxiosError_1;

    // alias for CanceledError for backward compatibility
    axios$1.Cancel = axios$1.CanceledError;

    // Expose all/spread
    axios$1.all = function all(promises) {
      return Promise.all(promises);
    };
    axios$1.spread = spread;

    // Expose isAxiosError
    axios$1.isAxiosError = isAxiosError;

    var axios_1 = axios$1;

    // Allow use of default import syntax in TypeScript
    var _default = axios$1;
    axios_1.default = _default;

    var axios = axios_1;

    /* src/components/Notification.svelte generated by Svelte v3.55.0 */

    const file$4 = "src/components/Notification.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t = text(/*message*/ ctx[0]);
    			add_location(p, file$4, 5, 4, 95);
    			attr_dev(div, "class", "svelte-1ias17n");
    			add_location(div, file$4, 4, 0, 84);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*message*/ 1) set_data_dev(t, /*message*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Notification', slots, []);
    	let { message = "Your config has been saved ! 😉" } = $$props;
    	const writable_props = ['message'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Notification> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('message' in $$props) $$invalidate(0, message = $$props.message);
    	};

    	$$self.$capture_state = () => ({ message });

    	$$self.$inject_state = $$props => {
    		if ('message' in $$props) $$invalidate(0, message = $$props.message);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [message];
    }

    class Notification extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { message: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Notification",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get message() {
    		throw new Error("<Notification>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set message(value) {
    		throw new Error("<Notification>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const __CLIENTPREMIUM = true;

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const isLoadedList = writable(false);

    /* src/components/Loader.svelte generated by Svelte v3.55.0 */
    const file$3 = "src/components/Loader.svelte";

    // (15:4) {#if !isLoaded}
    function create_if_block$3(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			attr_dev(span, "class", "svelte-1jqjcz9");
    			add_location(span, file$3, 15, 8, 370);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(15:4) {#if !isLoaded}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let p;
    	let t0;
    	let t1;
    	let if_block = !/*isLoaded*/ ctx[1] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text(/*loadingText*/ ctx[0]);
    			t1 = space();
    			if (if_block) if_block.c();
    			attr_dev(p, "class", "svelte-1jqjcz9");
    			add_location(p, file$3, 13, 4, 319);
    			attr_dev(div, "class", "loader svelte-1jqjcz9");
    			add_location(div, file$3, 12, 0, 293);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(div, t1);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*loadingText*/ 1) set_data_dev(t0, /*loadingText*/ ctx[0]);

    			if (!/*isLoaded*/ ctx[1]) {
    				if (if_block) ; else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let isLoaded;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Loader', slots, []);
    	let { loadingText } = $$props;

    	onMount(() => {
    		isLoadedList.subscribe(value => {
    			$$invalidate(1, isLoaded = value);
    		});
    	});

    	$$self.$$.on_mount.push(function () {
    		if (loadingText === undefined && !('loadingText' in $$props || $$self.$$.bound[$$self.$$.props['loadingText']])) {
    			console.warn("<Loader> was created without expected prop 'loadingText'");
    		}
    	});

    	const writable_props = ['loadingText'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Loader> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('loadingText' in $$props) $$invalidate(0, loadingText = $$props.loadingText);
    	};

    	$$self.$capture_state = () => ({
    		isLoadedList,
    		onMount,
    		loadingText,
    		isLoaded
    	});

    	$$self.$inject_state = $$props => {
    		if ('loadingText' in $$props) $$invalidate(0, loadingText = $$props.loadingText);
    		if ('isLoaded' in $$props) $$invalidate(1, isLoaded = $$props.isLoaded);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$invalidate(1, isLoaded = false);
    	return [loadingText, isLoaded];
    }

    class Loader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { loadingText: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Loader",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get loadingText() {
    		throw new Error("<Loader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set loadingText(value) {
    		throw new Error("<Loader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/PopUp.svelte generated by Svelte v3.55.0 */
    const file$2 = "src/components/PopUp.svelte";

    // (23:0) {#if !close}
    function create_if_block$2(ctx) {
    	let div5;
    	let div4;
    	let span;
    	let t1;
    	let div2;
    	let div1;
    	let p;
    	let t2;
    	let loader;
    	let t3;
    	let div0;
    	let button0;
    	let t5;
    	let t6;
    	let div3;
    	let button1;
    	let t7;
    	let t8;
    	let current;
    	let mounted;
    	let dispose;

    	loader = new Loader({
    			props: { loadingText: /*loadingText*/ ctx[8] },
    			$$inline: true
    		});

    	let if_block0 = /*clientPremium*/ ctx[5] && create_if_block_2$1(ctx);
    	let if_block1 = /*confirmButton*/ ctx[4] !== "" && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			span = element("span");
    			span.textContent = "Fermer ✕";
    			t1 = space();
    			div2 = element("div");
    			div1 = element("div");
    			p = element("p");
    			t2 = space();
    			create_component(loader.$$.fragment);
    			t3 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "Voir la liste des produits";
    			t5 = space();
    			if (if_block0) if_block0.c();
    			t6 = space();
    			div3 = element("div");
    			button1 = element("button");
    			t7 = text(/*cancelButton*/ ctx[3]);
    			t8 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(span, "class", "close svelte-4jh890");
    			add_location(span, file$2, 25, 8, 728);
    			add_location(p, file$2, 28, 20, 902);
    			attr_dev(button0, "class", "svelte-4jh890");
    			add_location(button0, file$2, 31, 20, 1061);
    			attr_dev(div0, "class", "premium-section-list svelte-4jh890");
    			add_location(div0, file$2, 30, 20, 1005);
    			attr_dev(div1, "class", "info");
    			add_location(div1, file$2, 27, 16, 862);
    			attr_dev(div2, "class", "sended");
    			add_location(div2, file$2, 26, 12, 824);
    			attr_dev(button1, "class", "btn cancel svelte-4jh890");
    			add_location(button1, file$2, 44, 12, 1581);
    			attr_dev(div3, "class", "btns svelte-4jh890");
    			add_location(div3, file$2, 43, 8, 1549);
    			attr_dev(div4, "class", "modal svelte-4jh890");
    			add_location(div4, file$2, 24, 4, 699);
    			attr_dev(div5, "class", "modal-bg svelte-4jh890");
    			add_location(div5, file$2, 23, 0, 671);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, span);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			p.innerHTML = /*message*/ ctx[2];
    			append_dev(div1, t2);
    			mount_component(loader, div1, null);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t5);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			append_dev(div3, button1);
    			append_dev(button1, t7);
    			append_dev(div3, t8);
    			if (if_block1) if_block1.m(div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(span, "click", /*closePopUp*/ ctx[9], false, false, false),
    					listen_dev(
    						span,
    						"click",
    						function () {
    							if (is_function(/*action*/ ctx[6])) /*action*/ ctx[6].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(button0, "click", /*click_handler*/ ctx[12], false, false, false),
    					listen_dev(
    						button1,
    						"click",
    						function () {
    							if (is_function(/*action*/ ctx[6])) /*action*/ ctx[6].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(button1, "click", /*closePopUp*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (!current || dirty & /*message*/ 4) p.innerHTML = /*message*/ ctx[2];			const loader_changes = {};
    			if (dirty & /*loadingText*/ 256) loader_changes.loadingText = /*loadingText*/ ctx[8];
    			loader.$set(loader_changes);

    			if (/*clientPremium*/ ctx[5]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*clientPremium*/ 32) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div0, null);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*cancelButton*/ 8) set_data_dev(t7, /*cancelButton*/ ctx[3]);

    			if (/*confirmButton*/ ctx[4] !== "") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$1(ctx);
    					if_block1.c();
    					if_block1.m(div3, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_component(loader);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(23:0) {#if !close}",
    		ctx
    	});

    	return block;
    }

    // (33:20) {#if clientPremium}
    function create_if_block_2$1(ctx) {
    	let div;
    	let current;
    	let if_block = /*showList*/ ctx[1] && create_if_block_3$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "list");
    			add_location(div, file$2, 33, 20, 1227);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*showList*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showList*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_3$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(33:20) {#if clientPremium}",
    		ctx
    	});

    	return block;
    }

    // (35:24) {#if showList}
    function create_if_block_3$1(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[11].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[10], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[10],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[10], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(35:24) {#if showList}",
    		ctx
    	});

    	return block;
    }

    // (46:12) {#if confirmButton !== ""}
    function create_if_block_1$1(ctx) {
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*confirmButton*/ ctx[4]);
    			attr_dev(button, "class", "btn confirm svelte-4jh890");
    			add_location(button, file$2, 46, 12, 1725);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*confirmAction*/ ctx[7])) /*confirmAction*/ ctx[7].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*confirmButton*/ 16) set_data_dev(t, /*confirmButton*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(46:12) {#if confirmButton !== \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = !/*close*/ ctx[0] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!/*close*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*close*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PopUp', slots, ['default']);
    	let { close = true } = $$props;
    	let { message = "notification" } = $$props;
    	let { cancelButton = "Annuler" } = $$props;
    	let { confirmButton = "Confirmer" } = $$props;
    	let { clientPremium = __CLIENTPREMIUM } = $$props;
    	let { showList = false } = $$props;

    	let { action = () => {
    		
    	} } = $$props;

    	let { confirmAction = () => {
    		
    	} } = $$props;

    	let closePopUp = () => {
    		$$invalidate(0, close = !close);
    		isLoadedList.update(v => false);
    	};

    	let { loadingText = "Chargement de la liste" } = $$props;

    	const writable_props = [
    		'close',
    		'message',
    		'cancelButton',
    		'confirmButton',
    		'clientPremium',
    		'showList',
    		'action',
    		'confirmAction',
    		'loadingText'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PopUp> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		if (clientPremium) $$invalidate(1, showList = !showList);
    	};

    	$$self.$$set = $$props => {
    		if ('close' in $$props) $$invalidate(0, close = $$props.close);
    		if ('message' in $$props) $$invalidate(2, message = $$props.message);
    		if ('cancelButton' in $$props) $$invalidate(3, cancelButton = $$props.cancelButton);
    		if ('confirmButton' in $$props) $$invalidate(4, confirmButton = $$props.confirmButton);
    		if ('clientPremium' in $$props) $$invalidate(5, clientPremium = $$props.clientPremium);
    		if ('showList' in $$props) $$invalidate(1, showList = $$props.showList);
    		if ('action' in $$props) $$invalidate(6, action = $$props.action);
    		if ('confirmAction' in $$props) $$invalidate(7, confirmAction = $$props.confirmAction);
    		if ('loadingText' in $$props) $$invalidate(8, loadingText = $$props.loadingText);
    		if ('$$scope' in $$props) $$invalidate(10, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		__CLIENTPREMIUM,
    		Loader,
    		isLoadedList,
    		close,
    		message,
    		cancelButton,
    		confirmButton,
    		clientPremium,
    		showList,
    		action,
    		confirmAction,
    		closePopUp,
    		loadingText
    	});

    	$$self.$inject_state = $$props => {
    		if ('close' in $$props) $$invalidate(0, close = $$props.close);
    		if ('message' in $$props) $$invalidate(2, message = $$props.message);
    		if ('cancelButton' in $$props) $$invalidate(3, cancelButton = $$props.cancelButton);
    		if ('confirmButton' in $$props) $$invalidate(4, confirmButton = $$props.confirmButton);
    		if ('clientPremium' in $$props) $$invalidate(5, clientPremium = $$props.clientPremium);
    		if ('showList' in $$props) $$invalidate(1, showList = $$props.showList);
    		if ('action' in $$props) $$invalidate(6, action = $$props.action);
    		if ('confirmAction' in $$props) $$invalidate(7, confirmAction = $$props.confirmAction);
    		if ('closePopUp' in $$props) $$invalidate(9, closePopUp = $$props.closePopUp);
    		if ('loadingText' in $$props) $$invalidate(8, loadingText = $$props.loadingText);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		close,
    		showList,
    		message,
    		cancelButton,
    		confirmButton,
    		clientPremium,
    		action,
    		confirmAction,
    		loadingText,
    		closePopUp,
    		$$scope,
    		slots,
    		click_handler
    	];
    }

    class PopUp extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			close: 0,
    			message: 2,
    			cancelButton: 3,
    			confirmButton: 4,
    			clientPremium: 5,
    			showList: 1,
    			action: 6,
    			confirmAction: 7,
    			loadingText: 8
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PopUp",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get close() {
    		throw new Error("<PopUp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set close(value) {
    		throw new Error("<PopUp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get message() {
    		throw new Error("<PopUp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set message(value) {
    		throw new Error("<PopUp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cancelButton() {
    		throw new Error("<PopUp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cancelButton(value) {
    		throw new Error("<PopUp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get confirmButton() {
    		throw new Error("<PopUp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set confirmButton(value) {
    		throw new Error("<PopUp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get clientPremium() {
    		throw new Error("<PopUp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set clientPremium(value) {
    		throw new Error("<PopUp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showList() {
    		throw new Error("<PopUp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showList(value) {
    		throw new Error("<PopUp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get action() {
    		throw new Error("<PopUp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set action(value) {
    		throw new Error("<PopUp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get confirmAction() {
    		throw new Error("<PopUp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set confirmAction(value) {
    		throw new Error("<PopUp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get loadingText() {
    		throw new Error("<PopUp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set loadingText(value) {
    		throw new Error("<PopUp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Tabs.svelte generated by Svelte v3.55.0 */
    const file$1 = "src/components/Tabs.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (19:4) {#if Array.isArray(items)}
    function create_if_block$1(ctx) {
    	let each_1_anchor;
    	let each_value = /*items*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*activeTabValue, items, handleClick*/ 7) {
    				each_value = /*items*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(19:4) {#if Array.isArray(items)}",
    		ctx
    	});

    	return block;
    }

    // (20:8) {#each items as item}
    function create_each_block$1(ctx) {
    	let li;
    	let span0;
    	let t0_value = /*item*/ ctx[3].label + "";
    	let t0;
    	let t1;
    	let span1;
    	let t2;
    	let li_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			t2 = space();
    			add_location(span0, file$1, 21, 16, 522);
    			attr_dev(span1, "class", "line svelte-129qt12");
    			add_location(span1, file$1, 22, 16, 600);

    			attr_dev(li, "class", li_class_value = "" + (null_to_empty(/*activeTabValue*/ ctx[0] === /*item*/ ctx[3].value
    			? 'active'
    			: '') + " svelte-129qt12"));

    			add_location(li, file$1, 20, 12, 446);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span0);
    			append_dev(span0, t0);
    			append_dev(li, t1);
    			append_dev(li, span1);
    			append_dev(li, t2);

    			if (!mounted) {
    				dispose = listen_dev(
    					span0,
    					"click",
    					function () {
    						if (is_function(/*handleClick*/ ctx[2](/*item*/ ctx[3].value))) /*handleClick*/ ctx[2](/*item*/ ctx[3].value).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*items*/ 2 && t0_value !== (t0_value = /*item*/ ctx[3].label + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*activeTabValue, items*/ 3 && li_class_value !== (li_class_value = "" + (null_to_empty(/*activeTabValue*/ ctx[0] === /*item*/ ctx[3].value
    			? 'active'
    			: '') + " svelte-129qt12"))) {
    				attr_dev(li, "class", li_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(20:8) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let ul;
    	let show_if = Array.isArray(/*items*/ ctx[1]);
    	let if_block = show_if && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			if (if_block) if_block.c();
    			attr_dev(ul, "class", "tabs svelte-129qt12");
    			add_location(ul, file$1, 17, 0, 352);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			if (if_block) if_block.m(ul, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*items*/ 2) show_if = Array.isArray(/*items*/ ctx[1]);

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(ul, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tabs', slots, []);
    	let { items = [] } = $$props;
    	let { activeTabValue } = $$props;

    	onMount(() => {
    		// Set default tab value
    		if (Array.isArray(items) && items.length && items[0].value) {
    			$$invalidate(0, activeTabValue = items[0].value);
    		}
    	});

    	const handleClick = tabValue => () => $$invalidate(0, activeTabValue = tabValue);

    	$$self.$$.on_mount.push(function () {
    		if (activeTabValue === undefined && !('activeTabValue' in $$props || $$self.$$.bound[$$self.$$.props['activeTabValue']])) {
    			console.warn("<Tabs> was created without expected prop 'activeTabValue'");
    		}
    	});

    	const writable_props = ['items', 'activeTabValue'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tabs> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('items' in $$props) $$invalidate(1, items = $$props.items);
    		if ('activeTabValue' in $$props) $$invalidate(0, activeTabValue = $$props.activeTabValue);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		items,
    		activeTabValue,
    		handleClick
    	});

    	$$self.$inject_state = $$props => {
    		if ('items' in $$props) $$invalidate(1, items = $$props.items);
    		if ('activeTabValue' in $$props) $$invalidate(0, activeTabValue = $$props.activeTabValue);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [activeTabValue, items, handleClick];
    }

    class Tabs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { items: 1, activeTabValue: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabs",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get items() {
    		throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get activeTabValue() {
    		throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set activeTabValue(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.55.0 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[56] = list[i];
    	child_ctx[58] = i;
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[59] = list[i];
    	return child_ctx;
    }

    // (245:0) {#if 1 === currentTab}
    function create_if_block_3(ctx) {
    	let section;
    	let popup;
    	let t0;
    	let t1;
    	let form;
    	let div2;
    	let div0;
    	let h30;
    	let t3;
    	let hr0;
    	let t4;
    	let div1;
    	let input0;
    	let t5;
    	let label0;
    	let t7;
    	let t8;
    	let div7;
    	let div3;
    	let h31;
    	let t10;
    	let hr1;
    	let t11;
    	let div4;
    	let label1;
    	let t13;
    	let input1;
    	let t14;
    	let t15;
    	let div5;
    	let label2;
    	let t17;
    	let input2;
    	let t18;
    	let t19;
    	let div6;
    	let label3;
    	let t21;
    	let textarea;
    	let t22;
    	let t23;
    	let div8;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	popup = new PopUp({
    			props: {
    				close: !/*openPopUp*/ ctx[0],
    				message: /*popUpMessage*/ ctx[1],
    				cancelButton: /*cancelButtonText*/ ctx[2],
    				confirmButton: /*confirmButtonText*/ ctx[12],
    				action: /*reMountThis*/ ctx[20],
    				loadingText: /*loaderText*/ ctx[15],
    				confirmAction: (/*updateProductsPostMetaFromId*/ ctx[22], /*sendData*/ ctx[23]),
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block0 = /*isValideForm*/ ctx[7] && create_if_block_8(ctx);
    	let if_block1 = /*backend_odforfree_enabled*/ ctx[8] && create_if_block_7(ctx);

    	function select_block_type(ctx, dirty) {
    		if (!/*isValidMail*/ ctx[18]) return create_if_block_6;
    		return create_else_block_3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block2 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!/*isValidPhone*/ ctx[17]) return create_if_block_5;
    		return create_else_block_2;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block3 = current_block_type_1(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (!/*isValidMessage*/ ctx[16]) return create_if_block_4;
    		return create_else_block_1;
    	}

    	let current_block_type_2 = select_block_type_2(ctx);
    	let if_block4 = current_block_type_2(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			create_component(popup.$$.fragment);
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			form = element("form");
    			div2 = element("div");
    			div0 = element("div");
    			h30 = element("h3");
    			h30.textContent = "products set";
    			t3 = space();
    			hr0 = element("hr");
    			t4 = space();
    			div1 = element("div");
    			input0 = element("input");
    			t5 = space();
    			label0 = element("label");
    			label0.textContent = "Enable for all products initialized to 0.00 or no price!";
    			t7 = space();
    			if (if_block1) if_block1.c();
    			t8 = space();
    			div7 = element("div");
    			div3 = element("div");
    			h31 = element("h3");
    			h31.textContent = "send to";
    			t10 = space();
    			hr1 = element("hr");
    			t11 = space();
    			div4 = element("div");
    			label1 = element("label");
    			label1.textContent = "email";
    			t13 = space();
    			input1 = element("input");
    			t14 = space();
    			if_block2.c();
    			t15 = space();
    			div5 = element("div");
    			label2 = element("label");
    			label2.textContent = "phone";
    			t17 = space();
    			input2 = element("input");
    			t18 = space();
    			if_block3.c();
    			t19 = space();
    			div6 = element("div");
    			label3 = element("label");
    			label3.textContent = "message delay response";
    			t21 = space();
    			textarea = element("textarea");
    			t22 = space();
    			if_block4.c();
    			t23 = space();
    			div8 = element("div");
    			button = element("button");
    			button.textContent = "Enregistrer les modifications";
    			add_location(h30, file, 283, 4, 9015);
    			add_location(hr0, file, 284, 4, 9041);
    			add_location(div0, file, 282, 3, 9005);
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "name", "free");
    			attr_dev(input0, "id", "free");
    			add_location(input0, file, 287, 4, 9069);
    			attr_dev(label0, "for", "free");
    			attr_dev(label0, "class", "svelte-rfi8zv");
    			add_location(label0, file, 288, 4, 9152);
    			add_location(div1, file, 286, 3, 9059);
    			attr_dev(div2, "class", "form svelte-rfi8zv");
    			add_location(div2, file, 281, 2, 8983);
    			add_location(h31, file, 298, 4, 9443);
    			add_location(hr1, file, 299, 4, 9464);
    			add_location(div3, file, 297, 3, 9433);
    			attr_dev(label1, "for", "mail");
    			attr_dev(label1, "class", "svelte-rfi8zv");
    			add_location(label1, file, 302, 4, 9505);
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "name", "mail");
    			attr_dev(input1, "id", "mail");
    			add_location(input1, file, 303, 4, 9541);
    			attr_dev(div4, "class", "flex svelte-rfi8zv");
    			add_location(div4, file, 301, 3, 9482);
    			attr_dev(label2, "for", "phone");
    			attr_dev(label2, "class", "svelte-rfi8zv");
    			add_location(label2, file, 311, 4, 9821);
    			attr_dev(input2, "type", "tel");
    			attr_dev(input2, "name", "phone");
    			attr_dev(input2, "id", "phone");
    			add_location(input2, file, 312, 4, 9858);
    			attr_dev(div5, "class", "flex svelte-rfi8zv");
    			add_location(div5, file, 310, 3, 9798);
    			attr_dev(label3, "for", "delay");
    			attr_dev(label3, "class", "svelte-rfi8zv");
    			add_location(label3, file, 320, 4, 10126);
    			attr_dev(textarea, "name", "delay");
    			attr_dev(textarea, "id", "delay");
    			attr_dev(textarea, "cols", "50");
    			attr_dev(textarea, "rows", "10");
    			add_location(textarea, file, 321, 4, 10180);
    			attr_dev(div6, "class", "flex svelte-rfi8zv");
    			add_location(div6, file, 319, 3, 10103);
    			attr_dev(div7, "class", "form svelte-rfi8zv");
    			add_location(div7, file, 296, 2, 9411);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "name", "submit");
    			attr_dev(button, "id", "submit");
    			attr_dev(button, "class", "button button-primary");
    			add_location(button, file, 330, 3, 10472);
    			add_location(div8, file, 329, 2, 10463);
    			attr_dev(form, "class", "svelte-rfi8zv");
    			add_location(form, file, 280, 1, 8974);
    			attr_dev(section, "id", "config");
    			add_location(section, file, 245, 0, 7152);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			mount_component(popup, section, null);
    			append_dev(section, t0);
    			if (if_block0) if_block0.m(section, null);
    			append_dev(section, t1);
    			append_dev(section, form);
    			append_dev(form, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h30);
    			append_dev(div0, t3);
    			append_dev(div0, hr0);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, input0);
    			input0.checked = /*od_is_checkedFree*/ ctx[3];
    			append_dev(div1, t5);
    			append_dev(div1, label0);
    			append_dev(div2, t7);
    			if (if_block1) if_block1.m(div2, null);
    			append_dev(form, t8);
    			append_dev(form, div7);
    			append_dev(div7, div3);
    			append_dev(div3, h31);
    			append_dev(div3, t10);
    			append_dev(div3, hr1);
    			append_dev(div7, t11);
    			append_dev(div7, div4);
    			append_dev(div4, label1);
    			append_dev(div4, t13);
    			append_dev(div4, input1);
    			set_input_value(input1, /*od_mail*/ ctx[4]);
    			append_dev(div4, t14);
    			if_block2.m(div4, null);
    			append_dev(div7, t15);
    			append_dev(div7, div5);
    			append_dev(div5, label2);
    			append_dev(div5, t17);
    			append_dev(div5, input2);
    			set_input_value(input2, /*od_phone*/ ctx[5]);
    			append_dev(div5, t18);
    			if_block3.m(div5, null);
    			append_dev(div7, t19);
    			append_dev(div7, div6);
    			append_dev(div6, label3);
    			append_dev(div6, t21);
    			append_dev(div6, textarea);
    			set_input_value(textarea, /*od_delay*/ ctx[6]);
    			append_dev(div6, t22);
    			if_block4.m(div6, null);
    			append_dev(form, t23);
    			append_dev(form, div8);
    			append_dev(div8, button);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[25]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[26]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[27]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[28]),
    					listen_dev(button, "click", /*updateConfig*/ ctx[21], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const popup_changes = {};
    			if (dirty[0] & /*openPopUp*/ 1) popup_changes.close = !/*openPopUp*/ ctx[0];
    			if (dirty[0] & /*popUpMessage*/ 2) popup_changes.message = /*popUpMessage*/ ctx[1];
    			if (dirty[0] & /*cancelButtonText*/ 4) popup_changes.cancelButton = /*cancelButtonText*/ ctx[2];
    			if (dirty[0] & /*confirmButtonText*/ 4096) popup_changes.confirmButton = /*confirmButtonText*/ ctx[12];
    			if (dirty[0] & /*loaderText*/ 32768) popup_changes.loadingText = /*loaderText*/ ctx[15];

    			if (dirty[0] & /*productsList*/ 2048 | dirty[2] & /*$$scope*/ 1) {
    				popup_changes.$$scope = { dirty, ctx };
    			}

    			popup.$set(popup_changes);

    			if (/*isValideForm*/ ctx[7]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*isValideForm*/ 128) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_8(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(section, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (dirty[0] & /*od_is_checkedFree*/ 8) {
    				input0.checked = /*od_is_checkedFree*/ ctx[3];
    			}

    			if (/*backend_odforfree_enabled*/ ctx[8]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_7(ctx);
    					if_block1.c();
    					if_block1.m(div2, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*od_mail*/ 16 && input1.value !== /*od_mail*/ ctx[4]) {
    				set_input_value(input1, /*od_mail*/ ctx[4]);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div4, null);
    				}
    			}

    			if (dirty[0] & /*od_phone*/ 32) {
    				set_input_value(input2, /*od_phone*/ ctx[5]);
    			}

    			if (current_block_type_1 !== (current_block_type_1 = select_block_type_1(ctx))) {
    				if_block3.d(1);
    				if_block3 = current_block_type_1(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(div5, null);
    				}
    			}

    			if (dirty[0] & /*od_delay*/ 64) {
    				set_input_value(textarea, /*od_delay*/ ctx[6]);
    			}

    			if (current_block_type_2 !== (current_block_type_2 = select_block_type_2(ctx))) {
    				if_block4.d(1);
    				if_block4 = current_block_type_2(ctx);

    				if (if_block4) {
    					if_block4.c();
    					if_block4.m(div6, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(popup.$$.fragment, local);
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(popup.$$.fragment, local);
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(popup);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if_block2.d();
    			if_block3.d();
    			if_block4.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(245:0) {#if 1 === currentTab}",
    		ctx
    	});

    	return block;
    }

    // (256:3) {#if (Array.isArray(productsList))}
    function create_if_block_9(ctx) {
    	let table;
    	let tr;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let th3;
    	let t6;
    	let each_value_2 = /*productsList*/ ctx[11];
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "ID";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "Sku";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "Name";
    			t5 = space();
    			th3 = element("th");
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_style(th0, "border", "1px solid #dddddd");
    			set_style(th0, "text-align", "left");
    			set_style(th0, "padding", "8px");
    			attr_dev(th0, "font-weight", "bold");
    			attr_dev(th0, "class", "svelte-rfi8zv");
    			add_location(th0, file, 259, 5, 7799);
    			set_style(th1, "border", "1px solid #dddddd");
    			set_style(th1, "text-align", "left");
    			set_style(th1, "padding", "8px");
    			attr_dev(th1, "font-weight", "bold");
    			attr_dev(th1, "class", "svelte-rfi8zv");
    			add_location(th1, file, 260, 5, 7901);
    			set_style(th2, "border", "1px solid #dddddd");
    			set_style(th2, "text-align", "left");
    			set_style(th2, "padding", "8px");
    			attr_dev(th2, "font-weight", "bold");
    			attr_dev(th2, "class", "svelte-rfi8zv");
    			add_location(th2, file, 261, 5, 8004);
    			set_style(th3, "border", "1px solid #dddddd");
    			set_style(th3, "text-align", "left");
    			set_style(th3, "padding", "8px");
    			attr_dev(th3, "font-weight", "bold");
    			attr_dev(th3, "class", "svelte-rfi8zv");
    			add_location(th3, file, 262, 5, 8108);
    			set_style(tr, "border", "1px solid #dddddd");
    			set_style(tr, "text-align", "left");
    			set_style(tr, "padding", "8px");
    			attr_dev(tr, "class", "svelte-rfi8zv");
    			add_location(tr, file, 258, 4, 7723);
    			attr_dev(table, "id", "premium-list");
    			set_style(table, "font-family", "arial, sans-serif");
    			set_style(table, "border-collapse", "collapse");
    			set_style(table, "width", "100%");
    			attr_dev(table, "cellspacing", "0");
    			attr_dev(table, "cellpadding", "0");
    			attr_dev(table, "border", "0");
    			attr_dev(table, "class", "svelte-rfi8zv");
    			add_location(table, file, 256, 3, 7563);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t1);
    			append_dev(tr, th1);
    			append_dev(tr, t3);
    			append_dev(tr, th2);
    			append_dev(tr, t5);
    			append_dev(tr, th3);
    			append_dev(table, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*productsList*/ 2048) {
    				each_value_2 = /*productsList*/ ctx[11];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(table, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(256:3) {#if (Array.isArray(productsList))}",
    		ctx
    	});

    	return block;
    }

    // (265:4) {#each productsList as product}
    function create_each_block_2(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*product*/ ctx[59].id + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*product*/ ctx[59].sku + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*product*/ ctx[59].name + "";
    	let t4;
    	let t5;
    	let td3;
    	let t6_value = /*product*/ ctx[59].price + "";
    	let t6;
    	let t7;
    	let td4;
    	let a;
    	let t8;
    	let a_href_value;
    	let t9;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td4 = element("td");
    			a = element("a");
    			t8 = text("Voir le produit");
    			t9 = space();
    			set_style(td0, "border", "1px solid #dddddd");
    			set_style(td0, "text-align", "left");
    			set_style(td0, "padding", "8px");
    			attr_dev(td0, "class", "svelte-rfi8zv");
    			add_location(td0, file, 266, 5, 8329);
    			set_style(td1, "border", "1px solid #dddddd");
    			set_style(td1, "text-align", "left");
    			set_style(td1, "padding", "8px");
    			attr_dev(td1, "class", "svelte-rfi8zv");
    			add_location(td1, file, 267, 5, 8422);
    			set_style(td2, "border", "1px solid #dddddd");
    			set_style(td2, "text-align", "left");
    			set_style(td2, "padding", "8px");
    			attr_dev(td2, "class", "svelte-rfi8zv");
    			add_location(td2, file, 268, 5, 8516);
    			set_style(td3, "border", "1px solid #dddddd");
    			set_style(td3, "text-align", "left");
    			set_style(td3, "padding", "8px");
    			attr_dev(td3, "class", "svelte-rfi8zv");
    			add_location(td3, file, 269, 5, 8611);
    			attr_dev(a, "href", a_href_value = /*product*/ ctx[59].url);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file, 270, 75, 8777);
    			set_style(td4, "border", "1px solid #dddddd");
    			set_style(td4, "text-align", "left");
    			set_style(td4, "padding", "8px");
    			attr_dev(td4, "class", "svelte-rfi8zv");
    			add_location(td4, file, 270, 5, 8707);
    			set_style(tr, "border", "1px solid #dddddd");
    			set_style(tr, "text-align", "left");
    			set_style(tr, "padding", "8px");
    			attr_dev(tr, "class", "svelte-rfi8zv");
    			add_location(tr, file, 265, 4, 8253);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td4);
    			append_dev(td4, a);
    			append_dev(a, t8);
    			append_dev(tr, t9);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*productsList*/ 2048 && t0_value !== (t0_value = /*product*/ ctx[59].id + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*productsList*/ 2048 && t2_value !== (t2_value = /*product*/ ctx[59].sku + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*productsList*/ 2048 && t4_value !== (t4_value = /*product*/ ctx[59].name + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*productsList*/ 2048 && t6_value !== (t6_value = /*product*/ ctx[59].price + "")) set_data_dev(t6, t6_value);

    			if (dirty[0] & /*productsList*/ 2048 && a_href_value !== (a_href_value = /*product*/ ctx[59].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(265:4) {#each productsList as product}",
    		ctx
    	});

    	return block;
    }

    // (247:1) <PopUp  close="{!openPopUp}"       message="{popUpMessage}"       cancelButton="{cancelButtonText}"       confirmButton="{confirmButtonText}"       action="{reMountThis}"      loadingText="{loaderText}"       confirmAction="{updateProductsPostMetaFromId, sendData}">
    function create_default_slot(ctx) {
    	let div;
    	let show_if = Array.isArray(/*productsList*/ ctx[11]);
    	let if_block = show_if && create_if_block_9(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "overflow-scroll svelte-rfi8zv");
    			add_location(div, file, 253, 2, 7444);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*productsList*/ 2048) show_if = Array.isArray(/*productsList*/ ctx[11]);

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_9(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(247:1) <PopUp  close=\\\"{!openPopUp}\\\"       message=\\\"{popUpMessage}\\\"       cancelButton=\\\"{cancelButtonText}\\\"       confirmButton=\\\"{confirmButtonText}\\\"       action=\\\"{reMountThis}\\\"      loadingText=\\\"{loaderText}\\\"       confirmAction=\\\"{updateProductsPostMetaFromId, sendData}\\\">",
    		ctx
    	});

    	return block;
    }

    // (278:1) {#if isValideForm}
    function create_if_block_8(ctx) {
    	let notification;
    	let current;

    	notification = new Notification({
    			props: { ":isOk": /*isValideForm*/ ctx[7] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(notification.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(notification, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const notification_changes = {};
    			if (dirty[0] & /*isValideForm*/ 128) notification_changes[":isOk"] = /*isValideForm*/ ctx[7];
    			notification.$set(notification_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(notification.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(notification.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(notification, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(278:1) {#if isValideForm}",
    		ctx
    	});

    	return block;
    }

    // (291:3) {#if (backend_odforfree_enabled)}
    function create_if_block_7(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "mettre à jour";
    			attr_dev(button, "type", "button");
    			add_location(button, file, 292, 4, 9296);
    			add_location(div, file, 291, 3, 9286);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*updateProductsPostMetaFromId*/ ctx[22], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(291:3) {#if (backend_odforfree_enabled)}",
    		ctx
    	});

    	return block;
    }

    // (307:5) {:else}
    function create_else_block_3(ctx) {
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(307:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (305:4) {#if !isValidMail}
    function create_if_block_6(ctx) {
    	let small;

    	const block = {
    		c: function create() {
    			small = element("small");
    			small.textContent = "mail must contain \"@\" and \".\" something like that (com .fr .be etc)...";
    			set_style(small, "color", "#993300");
    			add_location(small, file, 305, 5, 9633);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, small, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(small);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(305:4) {#if !isValidMail}",
    		ctx
    	});

    	return block;
    }

    // (316:4) {:else}
    function create_else_block_2(ctx) {
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(316:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (314:4) {#if !isValidPhone}
    function create_if_block_5(ctx) {
    	let small;

    	const block = {
    		c: function create() {
    			small = element("small");
    			small.textContent = "Phone number must be like that +33612131415 / 06121311415";
    			set_style(small, "color", "#993300");
    			add_location(small, file, 314, 5, 9952);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, small, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(small);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(314:4) {#if !isValidPhone}",
    		ctx
    	});

    	return block;
    }

    // (325:4) {:else}
    function create_else_block_1(ctx) {
    	const block = { c: noop, m: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(325:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (323:4) {#if !isValidMessage}
    function create_if_block_4(ctx) {
    	let small;

    	const block = {
    		c: function create() {
    			small = element("small");
    			small.textContent = "Message for your customers mustn't contain specials characters";
    			set_style(small, "color", "#993300");
    			add_location(small, file, 323, 5, 10299);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, small, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(small);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(323:4) {#if !isValidMessage}",
    		ctx
    	});

    	return block;
    }

    // (337:0) {#if 2 === currentTab}
    function create_if_block(ctx) {
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let t2;
    	let table;
    	let promise;
    	let each_value_1 = /*productsListInDashboard*/ ctx[13];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 52
    	};

    	handle_promise(promise = /*productsListInDashboard*/ ctx[13].length > 0, info);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Tableau de bord";
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			table = element("table");
    			info.block.c();
    			add_location(h2, file, 338, 1, 10680);
    			attr_dev(div0, "class", "pagination svelte-rfi8zv");
    			add_location(div0, file, 339, 1, 10706);
    			attr_dev(table, "class", "svelte-rfi8zv");
    			add_location(table, file, 344, 1, 10925);
    			add_location(div1, file, 337, 1, 10673);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div1, t2);
    			append_dev(div1, table);
    			info.block.m(table, info.anchor = null);
    			info.mount = () => table;
    			info.anchor = null;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*currentpage, productsListInDashboard*/ 9216) {
    				each_value_1 = /*productsListInDashboard*/ ctx[13];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			info.ctx = ctx;

    			if (dirty[0] & /*productsListInDashboard*/ 8192 && promise !== (promise = /*productsListInDashboard*/ ctx[13].length > 0) && handle_promise(promise, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(337:0) {#if 2 === currentTab}",
    		ctx
    	});

    	return block;
    }

    // (341:2) {#each productsListInDashboard as p, index}
    function create_each_block_1(ctx) {
    	let span;
    	let a;
    	let t_value = /*index*/ ctx[58] + 1 + "";
    	let t;
    	let span_class_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[29](/*index*/ ctx[58]);
    	}

    	const block = {
    		c: function create() {
    			span = element("span");
    			a = element("a");
    			t = text(t_value);
    			add_location(a, file, 341, 63, 10840);

    			attr_dev(span, "class", span_class_value = "" + (null_to_empty(/*currentpage*/ ctx[10] === /*index*/ ctx[58]
    			? 'current-page'
    			: '') + " svelte-rfi8zv"));

    			add_location(span, file, 341, 3, 10780);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, a);
    			append_dev(a, t);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*currentpage*/ 1024 && span_class_value !== (span_class_value = "" + (null_to_empty(/*currentpage*/ ctx[10] === /*index*/ ctx[58]
    			? 'current-page'
    			: '') + " svelte-rfi8zv"))) {
    				attr_dev(span, "class", span_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(341:2) {#each productsListInDashboard as p, index}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>  import axios from "axios";  import {onMount}
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script>  import axios from \\\"axios\\\";  import {onMount}",
    		ctx
    	});

    	return block;
    }

    // (348:2) {:then productListInDashboard}
    function create_then_block(ctx) {
    	let show_if = Array.isArray(/*productsListInDashboard*/ ctx[13]) && /*productsListInDashboard*/ ctx[13].length > 0;
    	let if_block_anchor;
    	let if_block = show_if && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*productsListInDashboard*/ 8192) show_if = Array.isArray(/*productsListInDashboard*/ ctx[13]) && /*productsListInDashboard*/ ctx[13].length > 0;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(348:2) {:then productListInDashboard}",
    		ctx
    	});

    	return block;
    }

    // (349:1) {#if Array.isArray(productsListInDashboard) && productsListInDashboard.length > 0}
    function create_if_block_1(ctx) {
    	let t;
    	let each_1_anchor;

    	function select_block_type_3(ctx, dirty) {
    		if (/*productsListInDashboardCount*/ ctx[14] === 0) return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_3(ctx);
    	let if_block = current_block_type(ctx);
    	let each_value = /*productsListInDashboard*/ ctx[13][/*currentpage*/ ctx[10]];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			if_block.c();
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_3(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(t.parentNode, t);
    				}
    			}

    			if (dirty[0] & /*productsListInDashboard, currentpage*/ 9216) {
    				each_value = /*productsListInDashboard*/ ctx[13][/*currentpage*/ ctx[10]];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(349:1) {#if Array.isArray(productsListInDashboard) && productsListInDashboard.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (352:2) {:else}
    function create_else_block(ctx) {
    	let p;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Total: ");
    			t1 = text(/*productsListInDashboardCount*/ ctx[14]);
    			add_location(p, file, 352, 3, 11197);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*productsListInDashboardCount*/ 16384) set_data_dev(t1, /*productsListInDashboardCount*/ ctx[14]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(352:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (350:2) {#if (productsListInDashboardCount === 0)}
    function create_if_block_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(350:2) {#if (productsListInDashboardCount === 0)}",
    		ctx
    	});

    	return block;
    }

    // (355:2) {#each productsListInDashboard[currentpage] as productItem}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*productItem*/ ctx[53].id + "";
    	let t0;
    	let t1;
    	let td1;
    	let img;
    	let img_src_value;
    	let t2;
    	let td2;
    	let t3_value = /*productItem*/ ctx[53].name + "";
    	let t3;
    	let t4;
    	let td3;
    	let t5_value = /*productItem*/ ctx[53].sku + "";
    	let t5;
    	let t6;
    	let td4;
    	let a0;
    	let t7;
    	let a0_href_value;
    	let t8;
    	let td5;
    	let a1;
    	let t9;
    	let a1_href_value;
    	let t10;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			img = element("img");
    			t2 = space();
    			td2 = element("td");
    			t3 = text(t3_value);
    			t4 = space();
    			td3 = element("td");
    			t5 = text(t5_value);
    			t6 = space();
    			td4 = element("td");
    			a0 = element("a");
    			t7 = text("Voir la fiche");
    			t8 = space();
    			td5 = element("td");
    			a1 = element("a");
    			t9 = text("Editer le produit");
    			t10 = space();
    			attr_dev(td0, "class", "svelte-rfi8zv");
    			add_location(td0, file, 356, 4, 11355);
    			if (!src_url_equal(img.src, img_src_value = /*productItem*/ ctx[53].image[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "100");
    			attr_dev(img, "height", "100");
    			attr_dev(img, "alt", "");
    			add_location(img, file, 357, 8, 11389);
    			attr_dev(td1, "class", "svelte-rfi8zv");
    			add_location(td1, file, 357, 4, 11385);
    			attr_dev(td2, "class", "svelte-rfi8zv");
    			add_location(td2, file, 358, 4, 11465);
    			attr_dev(td3, "class", "svelte-rfi8zv");
    			add_location(td3, file, 359, 4, 11497);
    			attr_dev(a0, "href", a0_href_value = /*productItem*/ ctx[53].url);
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file, 360, 8, 11532);
    			attr_dev(td4, "class", "svelte-rfi8zv");
    			add_location(td4, file, 360, 4, 11528);
    			attr_dev(a1, "href", a1_href_value = /*productItem*/ ctx[53].admin_url);
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file, 361, 8, 11607);
    			attr_dev(td5, "class", "svelte-rfi8zv");
    			add_location(td5, file, 361, 4, 11603);
    			attr_dev(tr, "class", "dashboard-product-item svelte-rfi8zv");
    			add_location(tr, file, 355, 3, 11315);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, img);
    			append_dev(tr, t2);
    			append_dev(tr, td2);
    			append_dev(td2, t3);
    			append_dev(tr, t4);
    			append_dev(tr, td3);
    			append_dev(td3, t5);
    			append_dev(tr, t6);
    			append_dev(tr, td4);
    			append_dev(td4, a0);
    			append_dev(a0, t7);
    			append_dev(tr, t8);
    			append_dev(tr, td5);
    			append_dev(td5, a1);
    			append_dev(a1, t9);
    			append_dev(tr, t10);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*productsListInDashboard, currentpage*/ 9216 && t0_value !== (t0_value = /*productItem*/ ctx[53].id + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*productsListInDashboard, currentpage*/ 9216 && !src_url_equal(img.src, img_src_value = /*productItem*/ ctx[53].image[0])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty[0] & /*productsListInDashboard, currentpage*/ 9216 && t3_value !== (t3_value = /*productItem*/ ctx[53].name + "")) set_data_dev(t3, t3_value);
    			if (dirty[0] & /*productsListInDashboard, currentpage*/ 9216 && t5_value !== (t5_value = /*productItem*/ ctx[53].sku + "")) set_data_dev(t5, t5_value);

    			if (dirty[0] & /*productsListInDashboard, currentpage*/ 9216 && a0_href_value !== (a0_href_value = /*productItem*/ ctx[53].url)) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if (dirty[0] & /*productsListInDashboard, currentpage*/ 9216 && a1_href_value !== (a1_href_value = /*productItem*/ ctx[53].admin_url)) {
    				attr_dev(a1, "href", a1_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(355:2) {#each productsListInDashboard[currentpage] as productItem}",
    		ctx
    	});

    	return block;
    }

    // (346:44)    <p>Chargement de la liste ..."</p>   {:then productListInDashboard}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Chargement de la liste ...\"";
    			add_location(p, file, 346, 2, 10980);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(346:44)    <p>Chargement de la liste ...\\\"</p>   {:then productListInDashboard}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let tabs;
    	let updating_activeTabValue;
    	let t0;
    	let t1;
    	let if_block1_anchor;
    	let current;

    	function tabs_activeTabValue_binding(value) {
    		/*tabs_activeTabValue_binding*/ ctx[24](value);
    	}

    	let tabs_props = { items: /*tabItems*/ ctx[19] };

    	if (/*currentTab*/ ctx[9] !== void 0) {
    		tabs_props.activeTabValue = /*currentTab*/ ctx[9];
    	}

    	tabs = new Tabs({ props: tabs_props, $$inline: true });
    	binding_callbacks.push(() => bind$1(tabs, 'activeTabValue', tabs_activeTabValue_binding, /*currentTab*/ ctx[9]));
    	let if_block0 = 1 === /*currentTab*/ ctx[9] && create_if_block_3(ctx);
    	let if_block1 = 2 === /*currentTab*/ ctx[9] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			create_component(tabs.$$.fragment);
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tabs, target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tabs_changes = {};

    			if (!updating_activeTabValue && dirty[0] & /*currentTab*/ 512) {
    				updating_activeTabValue = true;
    				tabs_changes.activeTabValue = /*currentTab*/ ctx[9];
    				add_flush_callback(() => updating_activeTabValue = false);
    			}

    			tabs.$set(tabs_changes);

    			if (1 === /*currentTab*/ ctx[9]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*currentTab*/ 512) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t1.parentNode, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (2 === /*currentTab*/ ctx[9]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tabs.$$.fragment, local);
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tabs.$$.fragment, local);
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tabs, detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let productsList;
    	let productsListInDashboard;
    	let productsListInDashboardCount;
    	let isValidMail;
    	let isValidPhone;
    	let isValidMessage;
    	let tableHTML;
    	let sendingCounterList;
    	let sendingList;
    	let confirmButtonText;
    	let loaderText;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let od_is_checkedFree;
    	let od_mail;
    	let od_phone;
    	let od_delay;
    	let isValideForm;
    	let backend_odforfree_enabled;
    	let currentTab;

    	// List of tab items with labels and values.
    	let tabItems = [{ label: "Configuration", value: 1 }, { label: "Tableau de bord", value: 2 }];

    	let sumOfProductsIntoWoo = 0;
    	let currentpage = 0;
    	let lookingForFreeProductsPage = 1;
    	let lastResult = [];
    	let page = 1;
    	let totalOfOnDemandProcucts = 0;
    	let { openPopUp = false } = $$props;
    	let { popUpMessage = "" } = $$props;
    	let { cancelButtonText = "" } = $$props;

    	function reMountThis() {
    		$$invalidate(0, openPopUp = false);
    	}

    	let initForm = async () => {
    		$$invalidate(3, od_is_checkedFree = await data.forfree === '1');
    		$$invalidate(8, backend_odforfree_enabled = await data.forfree === '1');
    		$$invalidate(4, od_mail = await data.email);
    		$$invalidate(5, od_phone = await data.phone);
    		$$invalidate(6, od_delay = await data.messagedelay);
    	};

    	let updateConfig = () => {
    		if (checkValidateForm()) {
    			const updateConfigOd = new URL('/wp-content/plugins/ondemand/includes/model/update_config_od_db.php', (document.currentScript && document.currentScript.src || new URL('bundle.js', document.baseURI).href)).pathname;

    			axios.put(updateConfigOd, null, {
    				params: {
    					free: od_is_checkedFree === true ? '1' : '0',
    					mail: od_mail,
    					phone: od_phone,
    					delay: od_delay
    				}
    			}).then(res => {
    				return JSON.parse(res.config.data);
    			}).catch(error => {
    				console.log(error);
    			});

    			$$invalidate(7, isValideForm = true);
    		} else {
    			$$invalidate(7, isValideForm = false);
    		}
    	};

    	let data;

    	let getDataFromOdDb = async () => {
    		const getDataOd = new URL('../../../includes/model/get_data_od_db.php', (document.currentScript && document.currentScript.src || new URL('bundle.js', document.baseURI).href)).pathname;
    		const dataUrl = await axios.get(getDataOd);
    		data = await dataUrl.data[0];
    	};

    	let validMail = () => {
    		return od_mail.match(/^[a-zA-Z0-9.! #$%&'*+/=? ^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/);
    	};

    	let validPhone = () => {
    		return od_phone.match(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/);
    	};

    	let validMessage = () => {
    		return od_delay.match(/^[A-Za-z0-9 -]*$/);
    	};

    	let checkValidateForm = () => {
    		$$invalidate(18, isValidMail = validMail());
    		$$invalidate(17, isValidPhone = validPhone());
    		$$invalidate(16, isValidMessage = validMessage());
    		return validMail() && validPhone() && validMessage();
    	};

    	let getCountProductsIntoWoo = () => {
    		const getWpCountProducts = new URL('/wp-content/plugins/ondemand/includes/model/get_wp_count_products.php', (document.currentScript && document.currentScript.src || new URL('bundle.js', document.baseURI).href)).pathname;

    		axios.get(getWpCountProducts).then(res => {
    			sumOfProductsIntoWoo = parseInt(res.data);
    		});
    	};

    	let updateProductsPostMetaFromId = async () => {
    		$$invalidate(0, openPopUp = !openPopUp);
    		$$invalidate(1, popUpMessage = sumOfProductsIntoWoo);
    		let updateListTemp = [];
    		let lastResultOfRequest = [];

    		if (Array.isArray(lastResultOfRequest)) {
    			do {
    				const manageFreeProducts = new URL('../../../includes/model/manage_free_products.php', (document.currentScript && document.currentScript.src || new URL('bundle.js', document.baseURI).href)).pathname;

    				axios.get(manageFreeProducts, {
    					params: { 'page': lookingForFreeProductsPage }
    				}).then(res => {
    					lastResultOfRequest = res.data;

    					if (Array.isArray(lastResultOfRequest) && lastResultOfRequest.length > 0) {
    						updateListTemp.push(lastResultOfRequest);
    						$$invalidate(11, productsList = updateListTemp.flat());
    						$$invalidate(15, loaderText = "recherche en cours ...");
    						lookingForFreeProductsPage++;
    					}

    					if (Array.isArray(productsList)) {
    						// ouverture de la pop up avec pour message le nombre de produit
    						$$invalidate(1, popUpMessage = `Vous êtes sur le point de passer en "à la demande" <strong>${productsList.length}</strong> produits de votre boutique`);

    						$$invalidate(2, cancelButtonText = "Annuler");
    						$$invalidate(12, confirmButtonText = "");
    					}
    				});

    				await sleep(10000);
    			} while (Array.isArray(lastResultOfRequest) && lastResultOfRequest.length > 0 && productsList.length > 0);

    			if (!(Array.isArray(lastResultOfRequest) && lastResultOfRequest.length > 0 && productsList.length > 0)) {
    				$$invalidate(15, loaderText = "La liste des produits est chargée");
    				$$invalidate(12, confirmButtonText = "Confirmer");
    				isLoadedList.update(v => true);
    			}

    			if (productsList.length === 0) {
    				$$invalidate(1, popUpMessage = "Tout est à jour");
    				$$invalidate(2, cancelButtonText = "Fermer");
    				$$invalidate(12, confirmButtonText = "");
    				$$invalidate(15, loaderText = "");
    			}
    		}
    	};

    	const sleep = milliseconds => {
    		return new Promise(resolve => setTimeout(resolve, milliseconds));
    	};

    	let getAllProductsOnDemand = async () => {
    		let tempList = [];

    		do {
    			const getAllOdProducts = new URL('../../../includes/model/get_all_od_products.php', (document.currentScript && document.currentScript.src || new URL('bundle.js', document.baseURI).href)).pathname;

    			axios.get(getAllOdProducts, { params: { page } }).then(res => {
    				lastResult = res.data;
    				tempList.push(lastResult);
    				$$invalidate(13, productsListInDashboard = tempList.filter(e => e.length));
    				page++;
    			});

    			await sleep(10000);
    		} while (lastResult.length > 0);

    		reconstructArray(tempList, productsListInDashboard, 25);
    	};

    	let reconstructArray = async (tempArray, definitiveArray, length) => {
    		let newArray = [];

    		for (let i = 0; i < tempArray.length; i++) {
    			for (let j = 0; j < tempArray[i].length; j++) {
    				newArray.push(tempArray[i][j]);
    				$$invalidate(14, productsListInDashboardCount = newArray.length);
    			}
    		}

    		definitiveArray = [];

    		while (newArray.length > 0) {
    			return definitiveArray.push(newArray.splice(0, length));
    		}

    		$$invalidate(13, productsListInDashboard = definitiveArray);
    	};

    	let promiseProductList = getAllProductsOnDemand();

    	let sendData = async () => {
    		for (let i = 0; i < productsList.length; i++) {
    			await postMetaData(productsList[i].id);
    			await sleep(500);
    		}
    	};

    	let postMetaData = async id => {
    		const updatePostMetaForFreeProduct = new URL('../../../includes/model/update_post_meta_for_free_product.php', (document.currentScript && document.currentScript.src || new URL('bundle.js', document.baseURI).href)).pathname;

    		axios.put(updatePostMetaForFreeProduct, null, { params: { id, value: "yes" } }).then(res => {
    			sendingCounterList.push(res.data);
    			sendingList = sendingCounterList.length !== productsList.length;
    			$$invalidate(1, popUpMessage = sendingList ? "updating list" : "list has updated");

    			if (sendingList) {
    				$$invalidate(1, popUpMessage = `Mise à jour produit ${sendingCounterList.length} / ${productsList.length}`);
    				$$invalidate(12, confirmButtonText = "");
    				$$invalidate(2, cancelButtonText = "");
    			} else {
    				$$invalidate(1, popUpMessage = "list has sent");
    				$$invalidate(2, cancelButtonText = "Fermer");
    				$$invalidate(12, confirmButtonText = "");
    			}
    		});
    	};

    	// log element for post in mail
    	let HTMLTable = () => {
    		tableHTML = JSON.stringify(productsList);
    	};

    	onMount(async () => {
    		await getDataFromOdDb();
    		await initForm();
    		await getCountProductsIntoWoo();
    	});

    	const writable_props = ['openPopUp', 'popUpMessage', 'cancelButtonText'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function tabs_activeTabValue_binding(value) {
    		currentTab = value;
    		$$invalidate(9, currentTab);
    	}

    	function input0_change_handler() {
    		od_is_checkedFree = this.checked;
    		$$invalidate(3, od_is_checkedFree);
    	}

    	function input1_input_handler() {
    		od_mail = this.value;
    		$$invalidate(4, od_mail);
    	}

    	function input2_input_handler() {
    		od_phone = this.value;
    		$$invalidate(5, od_phone);
    	}

    	function textarea_input_handler() {
    		od_delay = this.value;
    		$$invalidate(6, od_delay);
    	}

    	const click_handler = index => {
    		$$invalidate(10, currentpage = index);
    	};

    	$$self.$$set = $$props => {
    		if ('openPopUp' in $$props) $$invalidate(0, openPopUp = $$props.openPopUp);
    		if ('popUpMessage' in $$props) $$invalidate(1, popUpMessage = $$props.popUpMessage);
    		if ('cancelButtonText' in $$props) $$invalidate(2, cancelButtonText = $$props.cancelButtonText);
    	};

    	$$self.$capture_state = () => ({
    		axios,
    		onMount,
    		Notification,
    		PopUp,
    		Tabs,
    		Loader,
    		isLoadedList,
    		od_is_checkedFree,
    		od_mail,
    		od_phone,
    		od_delay,
    		isValideForm,
    		backend_odforfree_enabled,
    		currentTab,
    		tabItems,
    		sumOfProductsIntoWoo,
    		currentpage,
    		lookingForFreeProductsPage,
    		lastResult,
    		page,
    		totalOfOnDemandProcucts,
    		openPopUp,
    		popUpMessage,
    		cancelButtonText,
    		reMountThis,
    		initForm,
    		updateConfig,
    		data,
    		getDataFromOdDb,
    		validMail,
    		validPhone,
    		validMessage,
    		checkValidateForm,
    		getCountProductsIntoWoo,
    		updateProductsPostMetaFromId,
    		sleep,
    		getAllProductsOnDemand,
    		reconstructArray,
    		promiseProductList,
    		sendData,
    		postMetaData,
    		HTMLTable,
    		productsList,
    		tableHTML,
    		confirmButtonText,
    		sendingCounterList,
    		sendingList,
    		productsListInDashboard,
    		productsListInDashboardCount,
    		loaderText,
    		isValidMessage,
    		isValidPhone,
    		isValidMail
    	});

    	$$self.$inject_state = $$props => {
    		if ('od_is_checkedFree' in $$props) $$invalidate(3, od_is_checkedFree = $$props.od_is_checkedFree);
    		if ('od_mail' in $$props) $$invalidate(4, od_mail = $$props.od_mail);
    		if ('od_phone' in $$props) $$invalidate(5, od_phone = $$props.od_phone);
    		if ('od_delay' in $$props) $$invalidate(6, od_delay = $$props.od_delay);
    		if ('isValideForm' in $$props) $$invalidate(7, isValideForm = $$props.isValideForm);
    		if ('backend_odforfree_enabled' in $$props) $$invalidate(8, backend_odforfree_enabled = $$props.backend_odforfree_enabled);
    		if ('currentTab' in $$props) $$invalidate(9, currentTab = $$props.currentTab);
    		if ('tabItems' in $$props) $$invalidate(19, tabItems = $$props.tabItems);
    		if ('sumOfProductsIntoWoo' in $$props) sumOfProductsIntoWoo = $$props.sumOfProductsIntoWoo;
    		if ('currentpage' in $$props) $$invalidate(10, currentpage = $$props.currentpage);
    		if ('lookingForFreeProductsPage' in $$props) lookingForFreeProductsPage = $$props.lookingForFreeProductsPage;
    		if ('lastResult' in $$props) lastResult = $$props.lastResult;
    		if ('page' in $$props) page = $$props.page;
    		if ('totalOfOnDemandProcucts' in $$props) totalOfOnDemandProcucts = $$props.totalOfOnDemandProcucts;
    		if ('openPopUp' in $$props) $$invalidate(0, openPopUp = $$props.openPopUp);
    		if ('popUpMessage' in $$props) $$invalidate(1, popUpMessage = $$props.popUpMessage);
    		if ('cancelButtonText' in $$props) $$invalidate(2, cancelButtonText = $$props.cancelButtonText);
    		if ('initForm' in $$props) initForm = $$props.initForm;
    		if ('updateConfig' in $$props) $$invalidate(21, updateConfig = $$props.updateConfig);
    		if ('data' in $$props) data = $$props.data;
    		if ('getDataFromOdDb' in $$props) getDataFromOdDb = $$props.getDataFromOdDb;
    		if ('validMail' in $$props) validMail = $$props.validMail;
    		if ('validPhone' in $$props) validPhone = $$props.validPhone;
    		if ('validMessage' in $$props) validMessage = $$props.validMessage;
    		if ('checkValidateForm' in $$props) checkValidateForm = $$props.checkValidateForm;
    		if ('getCountProductsIntoWoo' in $$props) getCountProductsIntoWoo = $$props.getCountProductsIntoWoo;
    		if ('updateProductsPostMetaFromId' in $$props) $$invalidate(22, updateProductsPostMetaFromId = $$props.updateProductsPostMetaFromId);
    		if ('getAllProductsOnDemand' in $$props) getAllProductsOnDemand = $$props.getAllProductsOnDemand;
    		if ('reconstructArray' in $$props) reconstructArray = $$props.reconstructArray;
    		if ('promiseProductList' in $$props) promiseProductList = $$props.promiseProductList;
    		if ('sendData' in $$props) $$invalidate(23, sendData = $$props.sendData);
    		if ('postMetaData' in $$props) postMetaData = $$props.postMetaData;
    		if ('HTMLTable' in $$props) HTMLTable = $$props.HTMLTable;
    		if ('productsList' in $$props) $$invalidate(11, productsList = $$props.productsList);
    		if ('tableHTML' in $$props) tableHTML = $$props.tableHTML;
    		if ('confirmButtonText' in $$props) $$invalidate(12, confirmButtonText = $$props.confirmButtonText);
    		if ('sendingCounterList' in $$props) sendingCounterList = $$props.sendingCounterList;
    		if ('sendingList' in $$props) sendingList = $$props.sendingList;
    		if ('productsListInDashboard' in $$props) $$invalidate(13, productsListInDashboard = $$props.productsListInDashboard);
    		if ('productsListInDashboardCount' in $$props) $$invalidate(14, productsListInDashboardCount = $$props.productsListInDashboardCount);
    		if ('loaderText' in $$props) $$invalidate(15, loaderText = $$props.loaderText);
    		if ('isValidMessage' in $$props) $$invalidate(16, isValidMessage = $$props.isValidMessage);
    		if ('isValidPhone' in $$props) $$invalidate(17, isValidPhone = $$props.isValidPhone);
    		if ('isValidMail' in $$props) $$invalidate(18, isValidMail = $$props.isValidMail);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$invalidate(11, productsList = []);
    	$$invalidate(13, productsListInDashboard = []);
    	$$invalidate(14, productsListInDashboardCount = 0);
    	$$invalidate(18, isValidMail = true);
    	$$invalidate(17, isValidPhone = true);
    	$$invalidate(16, isValidMessage = true);
    	tableHTML = "";
    	sendingCounterList = [];
    	sendingList = false;
    	$$invalidate(12, confirmButtonText = "");
    	$$invalidate(15, loaderText = "");

    	{
    		reMountThis();
    	}

    	return [
    		openPopUp,
    		popUpMessage,
    		cancelButtonText,
    		od_is_checkedFree,
    		od_mail,
    		od_phone,
    		od_delay,
    		isValideForm,
    		backend_odforfree_enabled,
    		currentTab,
    		currentpage,
    		productsList,
    		confirmButtonText,
    		productsListInDashboard,
    		productsListInDashboardCount,
    		loaderText,
    		isValidMessage,
    		isValidPhone,
    		isValidMail,
    		tabItems,
    		reMountThis,
    		updateConfig,
    		updateProductsPostMetaFromId,
    		sendData,
    		tabs_activeTabValue_binding,
    		input0_change_handler,
    		input1_input_handler,
    		input2_input_handler,
    		textarea_input_handler,
    		click_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				openPopUp: 0,
    				popUpMessage: 1,
    				cancelButtonText: 2
    			},
    			null,
    			[-1, -1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get openPopUp() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set openPopUp(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get popUpMessage() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set popUpMessage(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cancelButtonText() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cancelButtonText(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.getElementById('on-demand-admin'),
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
