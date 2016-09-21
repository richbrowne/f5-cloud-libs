/**
 * Copyright 2016 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var q = require('q');

module.exports = {
    list: function(path, opts) {
        this.recordRequest('list', path, null, opts);
        return this.respond('list', path);
    },

    create: function(path, body, opts) {
        this.recordRequest('create', path, body, opts);
        return this.respond('create', path);
    },

    modify: function(path, body, opts) {
        this.recordRequest('modify', path, body, opts);
        return this.respond('modify', path);
    },

    delete: function(path, opts) {
        this.recordRequest('delete', path, null, opts);
        return this.respond('delete', path);
    },

    requestMap: {},

    responseMap: {},

    lastCall: {},

    when: function(method, path, response) {
        this.responseMap[method + '_' + path] = response;
    },

    reset: function() {
        this.responseMap = {};

        this.requestMap = {};
        this.lastCall.method = '';
        this.lastCall.path = '';
        this.lastCall.body = null;
        this.lastCall.opts = {};
    },

    recordRequest: function(method, path, body, opts) {
        var key = method + '_' + path;
        if (!this.requestMap[key]) {
            this.requestMap[key] = [];
        }
        this.requestMap[key].unshift(body);
        this.lastCall.method = method;
        this.lastCall.path = path;
        this.lastCall.body = body;
        this.lastCall.opts = opts;
    },

    getRequest: function(method, path) {
        var key = method + '_' + path;
        if (this.requestMap[key]) {
            return this.requestMap[key].pop();
        }
    },

    respond: function(method, path) {
        return q(this.responseMap[method + '_' + path] || true);
    }
};

