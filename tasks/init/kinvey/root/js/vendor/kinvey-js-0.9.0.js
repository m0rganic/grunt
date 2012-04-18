/*!
 * kinvey-js-0.9.0
 *
 * Copyright (c) 2012 Kinvey, Inc. All rights reserved.
 *
 * Licensed to Kinvey, Inc. under one or more contributor
 * license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership.  Kinvey, Inc. licenses this file to you under the
 * Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License.  You
 * may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
(function(undefined) {

  // Save reference to global object (window in browser, global on server).
  var root = this;

  /**
   * Top-level namespace. Exported for browser and CommonJS.
   * 
   * @name Kinvey
   * @namespace
   */
  var Kinvey;
  if('undefined' !== typeof exports) {
    Kinvey = exports;
  }
  else {
    Kinvey = root.Kinvey = {};
  }

  // Define a base class for all Kinvey classes. Provides a property method for
  // class inheritance. This method is available to all child definitions.
  var Base = Object.defineProperty(function() { }, 'extend', {
    value: function(prototype, properties) {
      // Create class definition
      var constructor = prototype && prototype.hasOwnProperty('constructor') ? prototype.constructor : this;
      var def = function() {
        constructor.apply(this, arguments);
      };

      // Set prototype by merging child prototype into parents.
      def.prototype = (function(parent, child) {
        Object.getOwnPropertyNames(child).forEach(function(property) {
          Object.defineProperty(parent, property, Object.getOwnPropertyDescriptor(child, property));
        });
        return parent;
      }(Object.create(this.prototype), prototype || {}));

      // Set static properties.
      if(properties) {
        for(var prop in properties) {
          def[prop] = properties[prop];
        }
      }

      // Add extend to definition.
      Object.defineProperty(def, 'extend', Object.getOwnPropertyDescriptor(this, 'extend'));

      // Return definition.
      return def;
    }
  });

  // Convenient method for binding context to anonymous functions.
  var bind = function(thisArg, fn) {
    return (fn || function() { }).bind(thisArg);
  };

  // Current user.
  var currentUser = null;

  /**
   * API version.
   * 
   * @constant
   */
  Kinvey.API_VERSION = 0;

  /**
   * SDK version.
   * 
   * @constant
   */
  Kinvey.SDK_VERSION = '0.1.0dev';

  /**
   * Returns current user, or null if not set.
   * 
   * @return {Kinvey.User} Current user.
   */
  Kinvey.getCurrentUser = function() {
    return currentUser;
  };

  /**
   * Initializes library for use with Kinvey services.
   * 
   * @example <code>
   * Kinvey.init({
   *   appKey: 'your-app-key',
   *   appSecret: 'your-app-secret',
   *   env: 'node'
   * });
   * </code>
   * 
   * @param {Object} options Kinvey credentials. Object expects properties:
   *          "appKey", "appSecret". Optional properties: "env".
   * @throws {Error}
   *           <ul>
   *           <li>On empty appKey,</li>
   *           <li>On empty appSecret.</li>
   *           </ul>
   */
  Kinvey.init = function(options) {
    if('undefined' === typeof options.appKey || null == options.appKey) {
      throw new Error('appKey must be defined');
    }
    if('undefined' === typeof options.appSecret || null == options.appSecret) {
      throw new Error('appSecret must be defined');
    }

    // Store credentials.
    Kinvey.appKey = options.appKey;
    Kinvey.appSecret = options.appSecret;
    Kinvey.env = options.env || 'HTML5';
  };

  /**
   * Round trips a request to the server and back, helps ensure connectivity.
   * 
   * @example <code>
   * Kinvey.ping(function() {
   *   console.log('Ping successful', this.kinvey, this.version);
   * }, function(error) {
   *   console.log('Ping failed', error.error);
   * });
   * </code>
   * 
   * @param {function()} [success] Success callback. {this} is a response object
   *          with properties: "kinvey", "version".
   * @param {function(Object)} [failure] Failure callback, {this} is an empty
   *          object. Only argument is an error object.
   */
  Kinvey.ping = function(success, failure) {
    var net = Kinvey.Net.factory(Kinvey.Net.APPDATA_API, '');
    net.send(function(response) {
      bind(response, success)();
    }, bind({}, failure));
  };

  /**
   * Sets the current user. This method is only used by the Kinvey.User
   * namespace.
   * 
   * @private
   * @param {Kinvey.User} user Current user.
   */
  Kinvey.setCurrentUser = function(user) {
    currentUser = user;
  };

  /**
   * Kinvey Net namespace definition. This namespace provides API and operation
   * constants to allow different network adapters. Network adapters live in
   * this namespace as well.
   * 
   * @namespace
   */
  Kinvey.Net = {
    // API Constants
    /**
     * AppData API.
     * 
     * @constant
     */
    APPDATA_API: 'APPDATA',

    /**
     * User API.
     * 
     * @constant
     */
    USER_API: 'USER',

    /**
     * Resource API.
     * 
     * @constant
     */
    RESOURCE_API: 'RESOURCE',

    // CRUD operation constants
    /**
     * Create operation.
     * 
     * @constant
     */
    CREATE: 'CREATE',

    /**
     * Read operation.
     * 
     * @constant
     */
    READ: 'READ',

    /**
     * Update operation.
     * 
     * @constant
     */
    UPDATE: 'UPDATE',

    /**
     * Delete operation.
     * 
     * @constant
     */
    DELETE: 'DELETE',

    // Methods
    /**
     * Returns a network adapter.
     * 
     * @example <code>
     * var net = Kinvey.Net.factory(Kinvey.Net.USER_API);
     * var net = Kinvey.Net.factory(Kinvey.Net.USER_API, 'user-id');
     * var net = Kinvey.Net.factory(Kinvey.Net.APPDATA_API, 'my-collection');
     * var net = Kinvey.Net.factory(Kinvey.Net.APPDATA_API, 'my-collection', 'entity-id');
     * </code>
     * 
     * @param {string} api One of Kinvey.Net API constants.
     * @param {string} [collection] Collection name. Required when using the
     *          AppData API.
     * @param {string} [id] Entity id.
     * @return {Object} One of Kinvey.Net.* adapters.
     */
    factory: function(api, collection, id) {
      if('node' === Kinvey.env.toLowerCase() && 'undefined' !== typeof Kinvey.Net.Node) {
        return new Kinvey.Net.Node(api, collection, id);
      }
      return new Kinvey.Net.Http(api, collection, id);
    }
  };

  /*globals btoa, XMLHttpRequest*/

  // Define the Kinvey.Net.Http network adapter.
  Kinvey.Net.Http = Base.extend({
    // Constants
    // Endpoints URLs.
    ENDPOINT: (function(base) {
      return {
        BASE: base,
        APPDATA: base + '/appdata',
        RESOURCE: base + '/resource',
        USER: base + '/user'
      };
    }('https://baas.kinvey.com')),

    // Map CRUD operations to HTTP request methods.
    METHOD: (function(Net) {
      var map = {};
      var cached = map[Net.CREATE] = 'POST';
      map[Net.READ] = 'GET';
      map[Net.UPDATE] = 'PUT';
      map[Net.DELETE] = 'DELETE';
      return map;
    }(Kinvey.Net)),

    // Properties.
    data: null,
    headers: {
      Accept: 'application/json, text/javascript',
      'Content-Type': 'application/json; charset=utf-8'
    },
    operation: Kinvey.Net.READ,
    query: null,

    /**
     * Creates a new HTTP network adapter.
     * 
     * @name Kinvey.Net.Http
     * @constructor
     * @param {string} api One of Kinvey.Net API constants.
     * @param {string} [collection] Collection name. Required when using the
     *          AppData API.
     * @param {string} [id] Entity id.
     * @throws {Error}
     *           <ul>
     *           <li>On invalid api,</li>
     *           <li>On undefined collection.</li>
     *           </ul>
     */
    constructor: function(api, collection, id) {
      if(null == api) {
        throw new Error('API must not be null');
      }
      switch(api) {
        case Kinvey.Net.APPDATA_API:
          if(null == collection) {
            throw new Error('Collection must not be null');
          }
          break;
        case Kinvey.Net.USER_API:
          break;
        default:
          throw new Error('API ' + api + ' is not supported');
      }

      this.api = api;
      this.collection = collection;
      this.id = id;
    },

    /** @lends Kinvey.Net.Http# */

    /**
     * Sends request.
     * 
     * @param {function(Object)} success Success callback. Only argument is a
     *          response object.
     * @param {function(Object)} failure Failure callback. Only argument is an
     *          error object.
     * @throws {Error} On unsupported client.
     */
    send: function(success, failure) {
      // A current user is required for all but the User API.
      if(null === Kinvey.getCurrentUser() && Kinvey.Net.USER_API !== this.api) {
        Kinvey.User.init(bind(this, function() {
          this._process(success, failure);
        }), failure);
        return;
      }

      // There is a current user already, or the User API is requested.
      this._process(success, failure);
    },

    /**
     * Sets data.
     * 
     * @param {Object} data JSON object.
     */
    setData: function(data) {
      this.data = data;
    },

    /**
     * Sets operation.
     * 
     * @param {string} operation Operation.
     * @throws {Error} On invalid operation.
     */
    setOperation: function(operation) {
      if(null == this.METHOD[operation]) {
        throw new Error('Operation ' + operation + ' is not supported');
      }
      this.operation = operation;
    },

    /**
     * Sets query.
     * 
     * @param {Kinvey.Query} query Query object.
     * @throws {Error} On invalid instance.
     */
    setQuery: function(query) {
      if(!(query instanceof Kinvey.Query)) {
        throw new Error('Query must be of instance Kinvey.Query');
      }
      this.query = query;
    },

    /**
     * Encodes a value, so that it can be safely used as part of the query
     * string.
     * 
     * @private
     * @param {*} value Value to be encoded.
     * @return {string} Encoded value.
     */
    _encode: function(value) {
      if(value instanceof Object) {
        value = JSON.stringify(value);
      }
      return encodeURIComponent(value);
    },

    /**
     * Returns plain authorization value.
     * 
     * @private
     * @return {string} Authorization value.
     */
    _getAuth: function() {
      var currentUser = Kinvey.getCurrentUser();
      if(null !== currentUser) {
        return currentUser.getUsername() + ':' + currentUser.getPassword();
      }
      return Kinvey.appKey + ':' + Kinvey.appSecret;
    },

    /**
     * Builds URL.
     * 
     * @private
     * @return {string} URL.
     */
    _getUrl: function() {
      var url = '';

      // Build path.
      switch(this.api) {
        case Kinvey.Net.APPDATA_API:
          url = this.ENDPOINT.APPDATA + '/' + Kinvey.appKey + '/' + this.collection;
          if(null != this.id) {
            url += '/' + this.id;
          }
          break;
        case Kinvey.Net.USER_API:
          // User API does not have a collection.
          url = this.ENDPOINT.USER + '/' + Kinvey.appKey + '/';
          if(null != this.id) {
            url += this.id;
          }
          break;
      }

      // Build query string.
      if(null != this.query) {
        var param = [ ];

        // Fill param with all query string parameters.
        var parts = this.query.toJSON();
        parts.limit && param.push('limit=' + this._encode(parts.limit));
        parts.skip && param.push('skip=' + this._encode(parts.skip));
        parts.sort && param.push('sort=' + this._encode(parts.sort));
        parts.query && param.push('query=' + this._encode(parts.query));

        // Append parts to URL.
        url += '?' + param.join('&');
      }
      return url;
    },

    /**
     * Parses HTTP response.
     * 
     * @private
     * @param {number} statusCode Status code.
     * @param {string} body Response body.
     * @param {function(Object)} success Success callback. Only argument is the
     *          parsed response body.
     * @param {function(Object)} failure Failure callback. Only argument is the
     *          parsed response body.
     */
    _handleResponse: function(statusCode, body, success, failure) {
      // Parse body. Failing to parse body is not a big deal.
      try {
        body = JSON.parse(body);
      }
      catch(_) {
      }

      // Fire callback.
      (200 <= statusCode && 300 > statusCode) || 304 === statusCode ? success(body) : failure(body);
    },

    /**
     * Processes and fires HTTP request.
     * 
     * @private
     * @param {function(Object)} success Success callback. Only argument is a
     *          response object.
     * @param {function(Object)} failure Failure callback. Only argument is an
     *          error object.
     */
    _process: function(success, failure) {
      if('undefined' === typeof XMLHttpRequest) {
        throw new Error('XMLHttpRequest is not supported');
      }

      // Create client and build request.
      var request = new XMLHttpRequest();
      request.open(this.METHOD[this.operation], this._getUrl(), true);

      // Add headers.
      for( var header in this.headers) {
        request.setRequestHeader(header, this.headers[header]);
      }
      request.setRequestHeader('Authorization', 'Basic ' + btoa(this._getAuth()));

      // Handle response.
      var self = this;
      request.onerror = function() {
        // Unfortunately, no error message is provided by XHR.
        failure({
          error: 'Error'
        });
      };
      request.onload = function() {
        self._handleResponse(this.status, this.responseText, success, failure);
      };

      // Fire request.
      var data = this.data ? JSON.stringify(this.data) : null;
      request.send(data);
    }
  });

  // Define the Kinvey Entity class.
  Kinvey.Entity = Base.extend({
    // Associated Kinvey API.
    API: Kinvey.Net.APPDATA_API,

    // Identifier attribute.
    ATTR_ID: '_id',

    /**
     * Creates a new entity.
     * 
     * @example <code>
     * var entity = new Kinvey.Entity('my-collection');
     * var entity = new Kinvey.Entity('my-collection', {
     *   key: 'value'
     * });
     * </code>
     * 
     * @name Kinvey.Entity
     * @constructor
     * @param {string} collection Owner collection.
     * @param {Object} [attr] Attribute object.
     * @throws {Error} On empty collection.
     */
    constructor: function(collection, attr) {
      if(null == collection) {
        throw new Error('Collection must not be null');
      }
      this.attr = attr || {};
      this.collection = collection;
    },

    /** @lends Kinvey.Entity# */

    /**
     * Destroys entity.
     * 
     * @param {function()} [success] Success callback. {this} is the (destroyed)
     *          entity instance.
     * @param {function(Object)} [failure] Failure callback. {this} is the
     *          entity instance. Only argument is an error object.
     */
    destroy: function(success, failure) {
      // Return instantly if entity is not saved yet.
      if(this.isNew()) {
        bind(this, success)();
        return;
      }

      // Send request.
      var net = Kinvey.Net.factory(this.API, this.collection, this.getId());
      net.setOperation(Kinvey.Net.DELETE);
      net.send(bind(this, function() {
        bind(this, success)();
      }), bind(this, failure));
    },

    /**
     * Returns attribute, or null if not set.
     * 
     * @param {string} key Attribute key.
     * @throws {Error} On empty key.
     * @return {*} Attribute.
     */
    get: function(key) {
      if(null == key) {
        throw new Error('Key must not be null');
      }

      // Return attribute, or null if attribute is null or undefined.
      var value = this.attr[key];
      return null != value ? value : null;
    },

    /**
     * Returns id or null if not set.
     * 
     * @return {string} id
     */
    getId: function() {
      return this.get(this.ATTR_ID);
    },

    /**
     * Returns whether entity is persisted.
     * 
     * @return {boolean}
     */
    isNew: function() {
      return null === this.getId();
    },

    /**
     * Loads entity by id.
     * 
     * @param {string} id Entity id.
     * @param {function()} [success] Success callback. {this} is the entity
     *          instance.
     * @param {function(Object)} [failure] Failure callback. {this} is the
     *          entity instance. Only argument is an error object.
     * @throws {Error} On empty id.
     */
    load: function(id, success, failure) {
      if(null == id) {
        throw new Error('Id must not be null');
      }

      // Retrieve data.
      var net = Kinvey.Net.factory(this.API, this.collection, id);
      net.send(bind(this, function(response) {
        this.attr = response;
        bind(this, success)();
      }), bind(this, failure));
    },

    /**
     * Saves entity.
     * 
     * @param {function()} [success] Success callback. {this} is the entity
     *          instance.
     * @param {function(Object)} [failure] Failure callback. {this} is the
     *          entity instance. Only argument is an error object.
     */
    save: function(success, failure) {
      var operation = this.isNew() ? Kinvey.Net.CREATE : Kinvey.Net.UPDATE;

      // Retrieve data.
      var net = Kinvey.Net.factory(this.API, this.collection, this.getId());
      net.setData(this.attr);// include attributes
      net.setOperation(operation);
      net.send(bind(this, function(response) {
        this.attr = response;
        bind(this, success)();
      }), bind(this, failure));
    },

    /**
     * Sets id.
     * 
     * @param {string} id Id.
     * @throws {Error} On empty id.
     */
    setId: function(id) {
      if(null == id) {
        throw new Error('Id must not be null');
      }
      this.set(this.ATTR_ID, id);
    },

    /**
     * Sets attribute.
     * 
     * @param {string} key Attribute key.
     * @param {*} value Attribute value.
     * @throws {Error} On empty key.
     */
    set: function(key, value) {
      if(null == key) {
        throw new Error('Key must not be null');
      }
      this.attr[key] = value;
    },

    /**
     * Returns JSON representation. Used by JSON#stringify.
     * 
     * @returns {Object} JSON representation.
     */
    toJSON: function() {
      return this.attr;
    },

    /**
     * Removes attribute.
     * 
     * @param {string} key Attribute key.
     */
    unset: function(key) {
      delete this.attr[key];
    }
  });

  // Define the Kinvey Collection class.
  Kinvey.Collection = Base.extend({
    // Associated Kinvey API.
    API: Kinvey.Net.APPDATA_API,

    // List of entities.
    list: [ ],

    // Mapped entity class.
    map: Kinvey.Entity,

    /**
     * Creates new collection.
     * 
     * @example <code>
     * var collection = new Kinvey.Collection('my-collection');
     * </code>
     * 
     * @constructor
     * @name Kinvey.Collection
     * @param {string} name Collection name.
     * @param {Kinvey.Query} [query] Query.
     * @throws {Error}
     *           <ul>
     *           <li>On empty name,</li>
     *           <li>On invalid query instance.</li>
     *           </ul>
     */
    constructor: function(name, query) {
      if(null == name) {
        throw new Error('Name must not be null');
      }
      if(query && !(query instanceof Kinvey.Query)) {
        throw new Error('Query must be an instanceof Kinvey.Query');
      }
      this.name = name;
      this.query = query;
    },

    /** @lends Kinvey.Collection# */

    /**
     * Clears collection. This method is NOT atomic, it stops on first failure.
     * 
     * @param {function()} [success] Success callback. {this} is the collection
     *          instance.
     * @param {function(Object)} [failure] Failure callback. {this} is the
     *          collection instance. Only argument is an error object.
     */
    clear: function(success, failure) {
      failure = bind(this, failure);
      this.list = [ ];// clear list

      // Retrieve all entities, and remove them one by one.
      this.fetch(bind(this, function() {
        var it = bind(this, function() {
          var entity = this.list[0];
          if(entity) {
            entity.destroy(bind(this, function() {
              this.list.shift();
              it();
            }), failure);
          }
          else {
            bind(this, success)();
          }
        });
        it();
      }), failure);
    },

    /**
     * Counts number of entities.
     * 
     * @example <code>
     * var collection = new Kinvey.Collection('my-collection');
     * collection.count(function(i) {
     *   console.log('Number of entities: ' + i);
     * }, function(error) {
     *   console.log('Count failed', error.error);
     * });
     * </code>
     * 
     * @param {function(number)} [success] Success callback. {this} is the
     *          Collection instance. Only argument is the number of entities.
     * @param {function(Object)} [failure] Failure callback. {this} is the
     *          Collection instance. Only argument is an error object.
     */
    count: function(success, failure) {
      var net = Kinvey.Net.factory(this.API, this.name, '_count');
      this.query && net.setQuery(this.query);// set query
      net.send(bind(this, function(response) {
        bind(this, success)(response.count);
      }), bind(this, failure));
    },

    /**
     * Fetches entities in collection.
     * 
     * @param {function()} [success] Success callback. {this} is the collection
     *          instance.
     * @param {function(Object)} [failure] Failure callback. {this} is the
     *          collection instance. Only argument is an error object.
     */
    fetch: function(success, failure) {
      // Clear list.
      this.list = [ ];

      // Send request.
      var net = Kinvey.Net.factory(this.API, this.name);
      this.query && net.setQuery(this.query);// set query
      net.send(bind(this, function(response) {
        response.forEach(bind(this, function(attr) {
          this.list.push(new this.map(this.name, attr));
        }));
        bind(this, success)();
      }), bind(this, failure));
    }
  });

  /*globals localStorage*/

  // Define the Kinvey User class.
  Kinvey.User = Kinvey.Entity.extend({
    // Associated Kinvey API.
    API: Kinvey.Net.USER_API,

    // Credential attributes.
    ATTR_USERNAME: 'username',
    ATTR_PASSWORD: 'password',

    /**
     * Creates a new user.
     * 
     * @example <code>
     * var user = new Kinvey.User();
     * var user = new Kinvey.User({
     *   key: 'value'
     * });
     * </code>
     * 
     * @name Kinvey.User
     * @constructor
     * @extends Kinvey.Entity
     * @param {Object} [attr] Attributes.
     */
    constructor: function(attr) {
      // Users reside in a distinct API, without the notion of collections.
      // Therefore, an empty string is passed to the parent constructor.
      Kinvey.Entity.prototype.constructor.call(this, '', attr);
    },

    /** @lends Kinvey.User# */

    /**
     * Destroys user. Use with caution.
     * 
     * @override
     * @see Kinvey.Entity#destroy
     */
    destroy: function(success, failure) {
      if(!this.isLoggedIn) {
        bind(this, failure)({
          error: 'This request requires the master secret'
        });
        return;
      }

      // Users are allowed to remove themselves.
      Kinvey.Entity.prototype.destroy.call(this, function() {
        this.logout();
        bind(this, success)();
      }, bind(this, failure));
    },

    /**
     * Returns password, or null if not set.
     * 
     * @return {string} Password.
     */
    getPassword: function() {
      return this.get(this.ATTR_PASSWORD);
    },

    /**
     * Returns username, or null if not set.
     * 
     * @return {string} Username.
     */
    getUsername: function() {
      return this.get(this.ATTR_USERNAME);
    },

    /**
     * Logs in user.
     * 
     * @example <code>
     * var user = new Kinvey.User();
     * user.login('username', 'password', function() {
     *   console.log('Login successful');
     * }, function(error) {
     *   console.log('Login failed', error);
     * });
     * </code>
     * 
     * @param {string} username Username.
     * @param {string} password Password.
     * @param {function()} [success] Success callback. {this} is the User
     *          instance.
     * @param {function(Object)} [failure] Failure callback. {this} is the User
     *          instance. Only argument is an error object.
     */
    login: function(username, password, success, failure) {
      // Make sure only one user is active at the time.
      var currentUser = Kinvey.getCurrentUser();
      if(null !== currentUser) {
        currentUser.logout();
      }

      // Retrieve user.
      this.setUsername(username);
      this.setPassword(password);

      // Send request.
      var net = Kinvey.Net.factory(this.API, this.collection, 'login');
      net.setData(this.attr);
      net.setOperation(Kinvey.Net.CREATE);
      net.send(bind(this, function(response) {
        // Update attributes. Preserve password since it is part of
        // the authorization.
        this.attr = response;
        this.setPassword(password);
        this._login();
        bind(this, success)();
      }), bind(this, failure));
    },

    /**
     * Logs out user.
     * 
     */
    logout: function() {
      if(this.isLoggedIn) {
        Kinvey.setCurrentUser(null);
        this._deleteFromDisk();
        this.isLoggedIn = false;
      }
    },

    /**
     * Saves a user.
     * 
     * @override
     * @see Kinvey.Entity#save
     */
    save: function(success, failure) {
      if(!this.isLoggedIn) {
        bind(this, failure)({
          error: 'This request requires the master secret'
        });
        return;
      }

      // Parent method will always update. Response does not include the
      // password, so persist it manually.
      var password = this.getPassword();
      Kinvey.Entity.prototype.save.call(this, function() {
        this.setPassword(password);
        this._login();
        bind(this, success)();
      }, failure);
    },

    /**
     * Sets password.
     * 
     * @param {string} password Password.
     * @throws {Error} On empty password.
     */
    setPassword: function(password) {
      if(null == password) {
        throw new Error('Password must not be null');
      }
      this.set(this.ATTR_PASSWORD, password);
    },

    /**
     * Sets username.
     * 
     * @param {string} username Username.
     * @throws {Error} On empty username.
     */
    setUsername: function(username) {
      if(null == username) {
        throw new Error('Username must not be null');
      }
      this.set(this.ATTR_USERNAME, username);
    },

    /**
     * Removes any user saved on disk.
     * 
     * @private
     */
    _deleteFromDisk: function() {
      localStorage.removeItem(Kinvey.User.CACHE_TAG);
    },

    /**
     * Marks user as logged in. This method should never be called standalone,
     * but always involve some network request.
     * 
     * @private
     */
    _login: function() {
      Kinvey.setCurrentUser(this);
      this._saveToDisk();
      this.isLoggedIn = true;
    },

    /**
     * Saves current user to disk.
     * 
     * @private
     */
    _saveToDisk: function() {
      localStorage.setItem(Kinvey.User.CACHE_TAG, JSON.stringify(this));
    }
  }, {
    /** @lends Kinvey.User */

    // Cache tag.
    CACHE_TAG: 'Kinvey.currentUser',

    /**
     * Creates the current user.
     * 
     * @example <code>
     * var user = Kinvey.create('username', 'password', function() {
     *   console.log('User created', this);
     * }, function(error) {
     *   console.log('User not created', error.error);
     * });
     * </code>
     * 
     * @param {string} [username] Username. Defaults to auto-generated one.
     * @param {string} [password] Password. Defaults to auto-generated one.
     * @param {function()} [success] Success callback. {this} is the User
     *          instance.
     * @param {function(Object)} [failure] Failure callback. {this} is the User
     *          instance. Only argument is an error object.
     * @return {Kinvey.User} The user instance (not necessarily persisted yet).
     */
    create: function(username, password, success, failure) {
      // Parse arguments.
      if(null == username || 'function' === typeof username) {
        // Auto-generate credentials.
        success = username;
        failure = password;
        username = password = '';
      }
      else if(null == password || 'function' === typeof password) {
        // Only auto-generate password.
        failure = success;
        success = password;
        password = '';
      }

      // Make sure only one user is active at the time.
      var currentUser = Kinvey.getCurrentUser();
      if(null !== currentUser) {
        currentUser.logout();
      }

      // Instantiate a user object.
      var user = new Kinvey.User();
      user.setUsername(username);
      user.setPassword(password);

      // Persist, and implicitly mark the created user as logged in.
      Kinvey.Entity.prototype.save.call(user, function() {
        this._login();
        bind(this, success)();
      }, failure);

      // Return the instance.
      return user;
    },

    /**
     * Initializes a current user. Restores the user from cache, or creates an
     * anonymous user. This method is called internally when doing a network
     * request. Manually invoking this function is however allowed.
     * 
     * @param {function()} [success] Success callback. {this} is the current
     *          user instance.
     * @param {function()} [failure] Failure callback. {this} is a user
     *          instance. Only argument is an error object.
     * @return {Kinvey.User} The user instance. (not necessarily persisted yet).
     */
    init: function(success, failure) {
      // First, check whether there already is a current user.
      var user = Kinvey.getCurrentUser();
      if(null !== user) {
        bind(user, success)();
        return user;
      }

      // Second, check if user attributes are stored locally on the device.
      var attr = JSON.parse(localStorage.getItem(Kinvey.User.CACHE_TAG));
      if(null !== attr && null != attr.username && null != attr.password) {
        // Re-authenticate user to ensure it is not stale.
        user = new Kinvey.User();
        user.login(attr.username, attr.password, success, failure);
        return user;
      }

      // No cached user available either, create anonymous user.
      return Kinvey.User.create(success, failure);
    }
  });

  // Define the Kinvey UserCollection class.
  Kinvey.UserCollection = Kinvey.Collection.extend({
    // Associated Kinvey API.
    API: Kinvey.Net.USER_API,

    // Mapped entity class.
    map: Kinvey.User,

    /**
     * Creates new user collection.
     * 
     * @example <code>
     * var collection = new Kinvey.UserCollection();
     * </code>
     * 
     * @name Kinvey.UserCollection
     * @constructor
     * @extends Kinvey.Collection
     * @param {Kinvey.Query} [query] Query.
     */
    constructor: function(query) {
      // Users reside in a distinct API, without the notion of collections.
      // Therefore, an empty string is passed to the parent constructor.
      Kinvey.Collection.prototype.constructor.call(this, '', query);
    },

    /** @lends Kinvey.UserCollection# */

    /**
     * Clears collection. This action is not allowed.
     * 
     * @override
     * @throws {Error}
     */
    clear: function() {
      throw new Error('This request requires the master secret');
    }
  });

  // Define the Kinvey Query class.
  Kinvey.Query = Base.extend({
    // Key under condition.
    currentKey: null,

    /**
     * Creates a new query.
     * 
     * @example <code>
     * var query = new Kinvey.Query();
     * </code>
     * 
     * @name Kinvey.Query
     * @constructor
     * @param {Object} [builder] One of Kinvey.Query.* builders.
     */
    constructor: function(builder) {
      this.builder = builder || Kinvey.Query.factory();
    },

    /** @lends Kinvey.Query# */

    /**
     * Sets an all condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must be an Array containing both "foo" and "bar".
     * var query = new Kinvey.Query();
     * query.on('field').all(['foo', 'bar']);
     * </code>
     * 
     * @param {Array} expected Array of expected values.
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    all: function(expected) {
      if(!(expected instanceof Array)) {
        throw new Error('Argument must be of type Array');
      }
      this._set(Kinvey.Query.ALL, expected);
      return this;
    },

    /**
     * Sets an AND condition.
     * 
     * @example <code>
     * // Attribute "field1" must have value "foo", and "field2" must have value "bar".
     * var query1 = new Kinvey.Query();
     * var query2 = new Kinvey.Query();
     * query1.on('field1').equal('foo');
     * query2.on('field2').equal('bar');
     * query1.and(query2);
     * </code>
     * 
     * @param {Kinvey.Query} query Query to AND.
     * @throws {Error} On invalid instance.
     * @return {Kinvey.Query} Current instance.
     */
    and: function(query) {
      this._set(Kinvey.Query.AND, query.builder, true);// do not throw.
      return this;
    },

    /**
     * Sets an equal condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have value "foo".
     * var query = new Kinvey.Query();
     * query.on('field').equal('foo');
     * </code>
     * 
     * @param {*} expected Expected value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    equal: function(expected) {
      this._set(Kinvey.Query.EQUAL, expected);
      return this;
    },

    /**
     * Sets an exist condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must exist.
     * var query = new Kinvey.Query();
     * query.on('field').exist();
     * </code>
     * 
     * @param {boolean} [expected] Boolean indicating whether field must be
     *          present. Defaults to true.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    exist: function(expected) {
      // Make sure the argument is of type boolean.
      expected = 'undefined' !== typeof expected ? !!expected : true;

      this._set(Kinvey.Query.EXIST, expected);
      return this;
    },

    /**
     * Sets a greater than condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value greater than 25.
     * var query = new Kinvey.Query();
     * query.on('field').greaterThan(25);
     * </code>
     * 
     * @param {*} value Compared value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    greaterThan: function(value) {
      this._set(Kinvey.Query.GREATER_THAN, value);
      return this;
    },

    /**
     * Sets a greater than equal condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value greater than or equal to 25.
     * var query = new Kinvey.Query();
     * query.on('field').greaterThanEqual(25);
     * </code>
     * 
     * @param {*} value Compared value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    greaterThanEqual: function(value) {
      this._set(Kinvey.Query.GREATER_THAN_EQUAL, value);
      return this;
    },

    /**
     * Sets an in condition on the current key. Method has underscore
     * postfix since "in" is a reserved word.
     * 
     * @example <code>
     * // Attribute "field" must be an Array containing "foo" and/or "bar".
     * var query = new Kinvey.Query();
     * query.on('field').in_(['foo', 'bar']);
     * </code>
     * 
     * @param {Array} expected Array of expected values.
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    in_: function(expected) {
      if(!(expected instanceof Array)) {
        throw new Error('Argument must be of type Array');
      }
      this._set(Kinvey.Query.IN, expected);
      return this;
    },

    /**
     * Sets a less than condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value less than 25.
     * var query = new Kinvey.Query();
     * query.on('field').lessThan(25);
     * </code>
     * 
     * @param {*} value Compared value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    lessThan: function(value) {
      this._set(Kinvey.Query.LESS_THAN, value);
      return this;
    },

    /**
     * Sets a less than equal condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value less than or equal to 25.
     * var query = new Kinvey.Query();
     * query.on('field').lessThanEqual(25);
     * </code>
     * 
     * @param {*} value Compared value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    lessThanEqual: function(value) {
      this._set(Kinvey.Query.LESS_THAN_EQUAL, value);
      return this;
    },

    /**
     * Sets a near sphere condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must be a point within a 10 mile radius of [-71, 42].
     * var query = new Kinvey.Query();
     * query.on('field').nearSphere([-71, 42], 10);
     * </code>
     * 
     * @param {Array} point Point [lng, lat].
     * @param {number} [maxDistance] Max distance from point in miles.
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    nearSphere: function(point, maxDistance) {
      if(!(point instanceof Array) || 2 !== point.length) {
        throw new Error('Point must be of type Array[lng, lat]');
      }
      this._set(Kinvey.Query.NEAR_SPHERE, {
        point: point,
        maxDistance: 'undefined' !== typeof maxDistance ? maxDistance : null
      });
      return this;
    },

    /**
     * Sets a not equal condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value not equal to "foo".
     * var query = new Kinvey.Query();
     * query.on('field').notEqual('foo');
     * </code>
     * 
     * @param {*} value Unexpected value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    notEqual: function(unexpected) {
      this._set(Kinvey.Query.NOT_EQUAL, unexpected);
      return this;
    },

    /**
     * Sets a not in condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must have a value not equal to "foo" or "bar".
     * var query = new Kinvey.Query();
     * query.on('field').notIn(['foo', 'bar']);
     * </code>
     * 
     * @param {Array} unexpected Array of unexpected values.
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    notIn: function(unexpected) {
      if(!(unexpected instanceof Array)) {
        throw new Error('Argument must be of type Array');
      }
      this._set(Kinvey.Query.NOT_IN, unexpected);
      return this;
    },

    /**
     * Sets key under condition.
     * 
     * @param {string} key Key under condition.
     * @return {Kinvey.Query} Current instance.
     */
    on: function(key) {
      this.currentKey = key;
      return this;
    },

    /**
     * Sets an OR condition.
     * 
     * @example <code>
     * // Attribute "field1" must have value "foo", or "field2" must have value "bar".
     * var query1 = new Kinvey.Query();
     * var query2 = new Kinvey.Query();
     * query1.on('field1').equal('foo');
     * query2.on('field2').equal('bar');
     * query1.or(query2);
     * </code>
     * 
     * @param {Kinvey.Query} query Query to OR.
     * @throws {Error} On invalid instance.
     * @return {Kinvey.Query} Current instance.
     */
    or: function(query) {
      this._set(Kinvey.Query.OR, query.builder, true);// do not throw.
      return this;
    },

    /**
     * Resets all filters.
     * 
     * @return {Kinvey.Query} Current instance.
     */
    reset: function() {
      this.builder.reset();
      return this;
    },

    /**
     * Sets the query limit.
     * 
     * @param {number} limit Limit.
     * @return {Kinvey.Query} Current instance.
     */
    setLimit: function(limit) {
      this.builder.setLimit(limit);
      return this;
    },

    /**
     * Sets the query skip.
     * 
     * @param {number} skip Skip.
     * @return {Kinvey.Query} Current instance.
     */
    setSkip: function(skip) {
      this.builder.setSkip(skip);
      return this;
    },

    /**
     * Sets a size condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must be an Array with 25 elements.
     * var query = new Kinvey.Query();
     * query.on('field').size(25);
     * </code>
     * 
     * @param {number} expected Expected value.
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    size: function(expected) {
      this._set(Kinvey.Query.SIZE, expected);
      return this;
    },

    /**
     * Sets the query sort.
     * 
     * @param {number} [direction] Sort direction, or null to reset sort.
     *          Defaults to ascending.
     * @return {Kinvey.Query} Current instance.
     */
    sort: function(direction) {
      if(null !== direction) {
        direction = direction || Kinvey.Query.ASC;
      }
      this.builder.setSort(this.currentKey, direction);
      return this;
    },

    /**
     * Returns JSON representation.
     * 
     * @return {Object} JSON representation.
     */
    toJSON: function() {
      return this.builder.toJSON();
    },

    /**
     * Sets a within box condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must be a point within the box [-72, 41], [-70, 43].
     * var query = new Kinvey.Query();
     * query.on('field').withinBox([[-72, 41], [-70, 43]]);
     * </code>
     * 
     * @param {Array} points Array of two points [[lng, lat], [lng, lat]].
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    withinBox: function(points) {
      if(!(points instanceof Array) || 2 !== points.length) {
        throw new Error('Points must be of type Array[[lng, lat], [lng, lat]]');
      }
      this._set(Kinvey.Query.WITHIN_BOX, points);
      return this;
    },

    /**
     * Sets a within center sphere condition on the current key.
     * 
     * @example <code>
     * // Attribute "field" must be a point within a 10 mile radius of [-71, 42].
     * var query = new Kinvey.Query();
     * query.on('field').withinCenterSphere([-72, 41], 0.0025);
     * </code>
     * 
     * @param {Array} point Point [lng, lat].
     * @param {number} radius Radius in radians.
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    withinCenterSphere: function(point, radius) {
      if(!(point instanceof Array) || 2 !== point.length) {
        throw new Error('Point must be of type Array[lng, lat]');
      }
      this._set(Kinvey.Query.WITHIN_CENTER_SPHERE, {
        center: point,
        radius: radius
      });
      return this;
    },

    /**
     * Sets a within polygon condition on the current key.
     * 
     * @param {Array} points Array of points [[lng, lat], ...].
     * @throws {Error}
     *           <ul>
     *           <li>On invalid argument,</li>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     * @return {Kinvey.Query} Current instance.
     */
    withinPolygon: function(points) {
      if(!(points instanceof Array)) {
        throw new Error('Points must be of type Array[[lng, lat], ...]');
      }
      this._set(Kinvey.Query.WITHIN_POLYGON, points);
      return this;
    },

    /**
     * Helper function to forward condition to builder.
     * 
     * @private
     * @throws {Error}
     *           <ul>
     *           <li>When there is no key under condition,</li>
     *           <li>When the condition is not supported by the builder.</li>
     *           </ul>
     */
    _set: function(operator, value, bypass) {
      // Bypass flag can be used to avoid throwing an error.
      if(null === this.currentKey && !bypass) {
        throw new Error('Key under condition must not be null');
      }
      this.builder.addCondition(this.currentKey, operator, value);
    }
  }, {
    /** @lends Kinvey.Query */

    // Basic operators.
    /**
     * Equal operator. Checks if an element equals the specified expression.
     * 
     * @constant
     */
    EQUAL: 16,

    /**
     * Exist operator. Checks if an element exists.
     * 
     * @constant
     */
    EXIST: 17,

    /**
     * Less than operator. Checks if an element is less than the specified
     * expression.
     * 
     * @constant
     */
    LESS_THAN: 18,

    /**
     * Less than or equal to operator. Checks if an element is less than or
     * equal to the specified expression.
     * 
     * @constant
     */
    LESS_THAN_EQUAL: 19,

    /**
     * Greater than operator. Checks if an element is greater than the
     * specified expression.
     * 
     * @constant
     */
    GREATER_THAN: 20,

    /**
     * Greater than or equal to operator. Checks if an element is greater
     * than or equal to the specified expression.
     * 
     * @constant
     */
    GREATER_THAN_EQUAL: 21,

    /**
     * Not equal operator. Checks if an element does not equals the
     * specified expression.
     * 
     * @constant
     */
    NOT_EQUAL: 22,

    // Geoqueries.
    /**
     * Near sphere operator. Checks if an element is close to the point in
     * the specified expression.
     * 
     * @constant
     */
    NEAR_SPHERE: 1024,

    /**
     * Within box operator. Checks if an element is within the box shape as
     * defined by the expression.
     * 
     * @constant
     */
    WITHIN_BOX: 1025,

    /**
     * Within center sphere operator. Checks if an element is within a
     * center sphere as defined by the expression.
     * 
     * @constant
     */
    WITHIN_CENTER_SPHERE: 1026,

    /**
     * Within polygon operator. Checks if an element is within a polygon
     * shape as defined by the expression.
     * 
     * @constant
     */
    WITHIN_POLYGON: 1027,

    /**
     * Max distance operator. Checks if an element is within a certain
     * distance to the point in the specified expression. This operator
     * requires the use of the near operator as well.
     * 
     * @constant
     */
    MAX_DISTANCE: 1028,

    // Set membership
    /**
     * In operator. Checks if an element matches any values in the specified
     * expression.
     * 
     * @constant
     */
    IN: 2048,

    /**
     * Not in operator. Checks if an element does not match any value in the
     * specified expression.
     * 
     * @constant
     */
    NOT_IN: 2049,

    // Joining operators.
    /**
     * And operator. Supported implicitly.
     * 
     * @constant
     */
    AND: 4096,

    /**
     * Or operator. Not supported.
     * 
     * @constant
     */
    OR: 4097,

    // Array operators.
    /**
     * All operator. Checks if an element matches all values in the
     * specified expression
     * 
     * @constant
     */
    ALL: 8192,

    /**
     * Size operator. Checks if the size of an element matches the specified
     * expression.
     * 
     * @constant
     */
    SIZE: 8193,

    // Sort operators.
    /**
     * Ascending sort operator.
     * 
     * @constant
     */
    ASC: 16384,

    /**
     * Descending sort operator.
     * 
     * @constant
     */
    DESC: 16385,

    /**
     * Returns a query builder.
     * 
     * @return {Object} One of Kinvey.Query.* builders.
     */
    factory: function() {
      // Currently, only the Mongo builder is supported.
      return new Kinvey.Query.MongoBuilder();
    }
  });

  // Define the Kinvey Query MongoBuilder class.
  Kinvey.Query.MongoBuilder = Base.extend({
    // Conditions.
    limit: null,
    skip: null,
    sort: null,
    query: null,

    /**
     * Creates a new MongoDB query builder.
     * 
     * @name Kinvey.Query.MongoBuilder
     * @constructor
     */
    constructor: function() {
      //
    },

    /** @lends Kinvey.Query.MongoBuilder# */

    /**
     * Adds condition.
     * 
     * @param {string} field Field.
     * @param {number} condition Condition.
     * @param {*} value Expression.
     * @throws {Error} On unsupported condition.
     */
    addCondition: function(field, condition, value) {
      switch(condition) {
        // Basic operators.
        // @see http://www.mongodb.org/display/DOCS/Advanced+Queries
        case Kinvey.Query.EQUAL:
          this._set(field, value);
          break;
        case Kinvey.Query.EXIST:
          this._set(field, { $exists: value });
          break;
        case Kinvey.Query.LESS_THAN:
          this._set(field, {$lt: value});
          break;
        case Kinvey.Query.LESS_THAN_EQUAL:
          this._set(field, {$lte: value});
          break;
        case Kinvey.Query.GREATER_THAN:
          this._set(field, {$gt: value});
          break;
        case Kinvey.Query.GREATER_THAN_EQUAL:
          this._set(field, {$gte: value});
          break;
        case Kinvey.Query.NOT_EQUAL:
          this._set(field, {$ne: value});
          break;

        // Geoqueries.
        // @see http://www.mongodb.org/display/DOCS/Geospatial+Indexing
        case Kinvey.Query.NEAR_SPHERE:
          var query = { $nearSphere: value.point };
          value.maxDistance && (query.$maxDistance = value.maxDistance);
          this._set(field, query);
          break;
        case Kinvey.Query.WITHIN_BOX:
          this._set(field, {$within: {$box: value}});
          break;
        case Kinvey.Query.WITHIN_CENTER_SPHERE:
          this._set(field, {$within: {$centerSphere: [value.center, value.radius] }});
          break;
        case Kinvey.Query.WITHIN_POLYGON:
          this._set(field, {$within: {$polygon: value}});
          break;

        // Set membership.
        // @see http://www.mongodb.org/display/DOCS/Advanced+Queries
        case Kinvey.Query.IN:
          this._set(field, {$in: value});
          break;
        case Kinvey.Query.NOT_IN:
          this._set(field, {$nin: value});
          break;

        // Joining operators.
        case Kinvey.Query.AND:
          if(!(value instanceof Kinvey.Query.MongoBuilder)) {
            throw new Error('Query must be of type Kinvey.Query.Mongobuilder');
          }
          this.query = { $and: [this.query || {}, value.query || {}] };
          break;
        case Kinvey.Query.OR:
          if(!(value instanceof Kinvey.Query.MongoBuilder)) {
            throw new Error('Query must be of type Kinvey.Query.Mongobuilder');
          }
          this.query = { $or: [this.query || {}, value.query || {}] };
          break;

        // Array operators.
        // @see http://www.mongodb.org/display/DOCS/Advanced+Queries
        case Kinvey.Query.ALL:
          this._set(field, {$all: value});
          break;
        case Kinvey.Query.SIZE:
          this._set(field, {$size: value});
          break;

        // Other operator.
        default:
          throw new Error('Condition ' + condition + ' is not supported');
      }
    },

    /**
     * Resets query.
     * 
     */
    reset: function() {
      this.query = null;
    },

    /**
     * Sets query limit.
     * 
     * @param {number} limit Limit, or null to reset limit.
     */
    setLimit: function(limit) {
      this.limit = limit;
    },

    /**
     * Sets query skip.
     * 
     * @param {number} skip Skip, or null to reset skip.
     */
    setSkip: function(skip) {
      this.skip = skip;
    },

    /**
     * Sets query sort.
     * 
     * @param {string} field Field.
     * @param {number} direction Sort direction, or null to reset sort.
     */
    setSort: function(field, direction) {
      if(null == direction) {
        this.sort = null;// hard reset
        return;
      }

      // Set sort value.
      var value = Kinvey.Query.ASC === direction ? 1 : -1;
      this.sort = {};// reset
      this.sort[field] = value;
    },

    /**
     * Returns JSON representation. Used by JSON#stringify.
     * 
     * @return {Object} JSON representation.
     */
    toJSON: function() {
      var result = {};
      this.limit && (result.limit = this.limit);
      this.skip && (result.skip = this.skip);
      this.sort && (result.sort = this.sort);
      this.query && (result.query = this.query);
      return result;
    },

    /**
     * Helper function to add expression to field.
     * 
     * @private
     */
    _set: function(field, expression) {
      this.query || (this.query = {});
      if(!(expression instanceof Object)) {// simple condition
        this.query[field] = expression;
        return;
      }

      // Complex condition.
      this.query[field] instanceof Object || (this.query[field] = {});
      for(var operator in expression) {
        this.query[field][operator] = expression[operator];
      }
    }
  });

}.call(this));