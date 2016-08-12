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
var BigIp = require('../../lib/bigIp');
var icontrolMock = require('../testUtil/icontrolMock');

var bigIp = new BigIp('host', 'user', 'password', {icontrol: icontrolMock});
bigIp.ready = function() {
    return q();
};

var localHostname = 'localhostname';
var deviceGroup = 'testDeviceGroup';

module.exports = {
    setUp: function(callback) {
        icontrolMock.reset();
        callback();
    },

    testAddToTrust: {
        testNotInTrust: function(test) {
            icontrolMock.when('list',
                              '/tm/cm/trust-domain/~Common~Root',
                              {
                                  caDevices: ['/Common/someOtherDevice']
                              });
            bigIp.cluster.addToTrust(localHostname, 'host', 'user', 'pass')
                .then(function() {
                    test.strictEqual(icontrolMock.lastCall.method, 'create');
                    test.strictEqual(icontrolMock.lastCall.path, '/tm/cm/add-to-trust');
                    test.strictEqual(icontrolMock.lastCall.body.deviceName, localHostname);
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        },

        testAlreadyInTrust: function(test) {
            icontrolMock.when('list',
                              '/tm/cm/trust-domain/~Common~Root',
                              {
                                  caDevices: ['/Common/someOtherDevice', '/Common/' + localHostname]
                              });
            bigIp.cluster.addToTrust(localHostname, 'host', 'user', 'pass')
                .then(function() {
                    test.strictEqual(icontrolMock.lastCall.method, 'list');
                    test.strictEqual(icontrolMock.lastCall.path, '/tm/cm/trust-domain/~Common~Root');
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        }
    },

    testAddToDeviceGroup: {
        testNotInDeviceGroup: function(test) {
            icontrolMock.when('list',
                              '/tm/cm/device-group/~Common~' + deviceGroup + '/devices',
                              [
                                   {
                                       name: 'notTheLocalDevice'
                                   }
                              ]
                            );

            bigIp.cluster.addToDeviceGroup(localHostname, deviceGroup)
                .then(function() {
                    test.strictEqual(icontrolMock.lastCall.method, 'create');
                    test.strictEqual(icontrolMock.lastCall.path, '/tm/cm/device-group/~Common~' + deviceGroup + '/devices');
                    test.deepEqual(icontrolMock.lastCall.body, {name: localHostname});
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        },

        testAlreadyInDeviceGroup: function(test) {
            icontrolMock.when('list',
                              '/tm/cm/device-group/~Common~' + deviceGroup + '/devices',
                              [
                                   {
                                       name: localHostname
                                   }
                              ]
                            );

            bigIp.cluster.addToDeviceGroup(localHostname, deviceGroup)
                .then(function() {
                    test.strictEqual(icontrolMock.lastCall.method, 'list');
                    test.strictEqual(icontrolMock.lastCall.path, '/tm/cm/device-group/~Common~' + deviceGroup + '/devices');
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        }
    },

    testCreateDeviceGroup: {
        testDefaults: function(test) {
            var name = 'groupFoo';
            var type = 'sync-failover';
            var devices =['device1', 'device2'];

            bigIp.cluster.createDeviceGroup(name, type, devices)
                .then(function() {
                    test.strictEqual(icontrolMock.lastCall.method, 'create');
                    test.strictEqual(icontrolMock.lastCall.path, '/tm/cm/device-group/');
                    test.strictEqual(icontrolMock.lastCall.body.name, name);
                    test.strictEqual(icontrolMock.lastCall.body.type, type);
                    test.strictEqual(icontrolMock.lastCall.body.devices, devices);
                    test.strictEqual(icontrolMock.lastCall.body.autoSync, 'disabled');
                    test.strictEqual(icontrolMock.lastCall.body.fullLoadOnSync, false);
                    test.strictEqual(icontrolMock.lastCall.body.asmSync, 'disabled');
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        },

        testFull: function(test) {
            var name = 'groupFoo';
            var type = 'sync-failover';
            var devices =['device1', 'device2'];
            var options = {
                autoSync: true,
                saveOnAutoSync: true,
                networkFailover: true,
                fullLoadOnSync: true,
                asmSync: true
            };

            bigIp.cluster.createDeviceGroup(name, type, devices, options)
                .then(function() {
                    test.strictEqual(icontrolMock.lastCall.method, 'create');
                    test.strictEqual(icontrolMock.lastCall.path, '/tm/cm/device-group/');
                    test.strictEqual(icontrolMock.lastCall.body.name, name);
                    test.strictEqual(icontrolMock.lastCall.body.type, type);
                    test.strictEqual(icontrolMock.lastCall.body.devices, devices);
                    test.strictEqual(icontrolMock.lastCall.body.autoSync, 'enabled');
                    test.strictEqual(icontrolMock.lastCall.body.saveOnAutoSync, true);
                    test.strictEqual(icontrolMock.lastCall.body.fullLoadOnSync, true);
                    test.strictEqual(icontrolMock.lastCall.body.asmSync, 'enabled');
                    test.strictEqual(icontrolMock.lastCall.body.networkFailover, 'enabled');
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        },

        testSyncOnly: function(test) {
            bigIp.cluster.createDeviceGroup('abc', 'sync-only', [])
                .then(function() {
                    test.strictEqual(icontrolMock.lastCall.body.type, 'sync-only');
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        },

        testNoName: function(test) {
            bigIp.cluster.createDeviceGroup()
                .then(function() {
                    test.ok(false, 'Should have thrown no name');
                })
                .catch(function(err) {
                    test.notEqual(err.message.indexOf('name is required'), -1);
                })
                .finally(function() {
                    test.done();
                });
        },

        testBadType: function(test) {
            bigIp.cluster.createDeviceGroup('abc', 'foo')
                .then(function() {
                    test.ok(false, 'Should have thrown bad type');
                })
                .catch(function(err) {
                    test.notEqual(err.message.indexOf('type must be'), -1);
                })
                .finally(function() {
                    test.done();
                });
        },

        testNoType: function(test) {
            bigIp.cluster.createDeviceGroup('abc')
                .then(function() {
                    test.ok(false, 'Should have thrown no type');
                })
                .catch(function(err) {
                    test.notEqual(err.message.indexOf('type must be'), -1);
                })
                .finally(function() {
                    test.done();
                });
        },

        testNoDevices: function(test) {
            bigIp.cluster.createDeviceGroup('abc', 'sync-failover', [])
                .then(function() {
                    test.strictEqual(icontrolMock.lastCall.body.devices.length, 0);
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        }
    },

    testConfigSync: {
        testSetConfigSyncIp: function(test) {
            var ip = '1.2.3.4';

            icontrolMock.when('list',
                              '/shared/identified-devices/config/device-info',
                              {
                                  hostname: localHostname
                              });

            bigIp.cluster.configSyncIp(ip)
                .then(function() {
                    test.strictEqual(icontrolMock.lastCall.method, 'modify');
                    test.strictEqual(icontrolMock.lastCall.path, '/tm/cm/device/~Common~' + localHostname);
                    test.deepEqual(icontrolMock.lastCall.body, {configsyncIp: ip});
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        },

        testSyncBasic: function(test) {
            var deviceGroup = 'someDeviceGroup';

            bigIp.cluster.sync('to-group', deviceGroup)
                .then(function() {
                    test.strictEqual(icontrolMock.lastCall.method, 'create');
                    test.strictEqual(icontrolMock.lastCall.path, '/tm/cm');
                    test.strictEqual(icontrolMock.lastCall.body.command, 'run');
                    test.strictEqual(icontrolMock.lastCall.body.utilCmdArgs, 'config-sync  to-group ' + deviceGroup);
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        },

        testSyncForceFullLoadPush: function(test) {
            var deviceGroup = 'someDeviceGroup';

            bigIp.cluster.sync('to-group', deviceGroup, true)
                .then(function() {
                    test.strictEqual(icontrolMock.lastCall.method, 'create');
                    test.strictEqual(icontrolMock.lastCall.path, '/tm/cm');
                    test.strictEqual(icontrolMock.lastCall.body.command, 'run');
                    test.strictEqual(icontrolMock.lastCall.body.utilCmdArgs, 'config-sync force-full-load-push to-group ' + deviceGroup);
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        }
    }
};