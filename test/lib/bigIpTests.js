/**
 * Copyright 2016 F5 Networks, Inc.
 *
 * This software may be modified and distributed under the terms
 * of the MIT license.  See the LICENSE file for details.
 */
'use strict';

var q = require('q');
var BigIp = require('../../lib/bigIp');
var util = require('../../lib/util');
var icontrolMock = require('../testUtil/icontrolMock');

var bigIp = new BigIp('host', 'user', 'password');
var realReady = bigIp.ready;  // Store this so we can test the ready function

bigIp.icontrol = icontrolMock;

module.exports = {
    setUp: function(callback) {
        bigIp.ready = function() {
            return q();
        };
        icontrolMock.reset();
        callback();
    },

    testActive: function(test) {
        icontrolMock.when(
            'list',
            '/tm/cm/failover-status',
            {
                entries: {
                    'https://localhost/mgmt/tm/cm/failover-status/0': {
                        nestedStats: {
                            entries: {
                                status: {
                                    description: 'ACTIVE'
                                }
                            }
                        }
                    }
                }
            }
        );

        bigIp.active()
            .then(function() {
                test.ok(true);
            })
            .catch(function(err) {
                test.ok(false, err.message);
            })
            .finally(function() {
                test.done();
            });
    },

    testNotActive: function(test) {
        icontrolMock.when(
            'list',
            '/tm/cm/failover-status',
            {
                entries: {
                    'https://localhost/mgmt/tm/cm/failover-status/0': {
                        nestedStats: {
                            entries: {
                                status: {
                                    description: 'FOOBAR'
                                }
                            }
                        }
                    }
                }
            }
        );

        bigIp.active(util.NO_RETRY)
            .then(function() {
                test.ok(false, "BIG-IP should not be active.");
            })
            .catch(function() {
                test.ok(true);
            })
            .finally(function() {
                test.done();
            });
    },

    testListSuccess: function(test) {
        bigIp.list();
        test.strictEqual(icontrolMock.lastCall.method, 'list');
        test.done();
    },

    testLoadNoFile: function(test) {
        bigIp.load()
            .then(function() {
                test.strictEqual(icontrolMock.lastCall.method, 'create');
                test.strictEqual(icontrolMock.lastCall.path, '/tm/sys/config');
                test.strictEqual(icontrolMock.lastCall.body.command, 'load');
                test.strictEqual(icontrolMock.lastCall.body.name, 'default');
            })
            .catch(function(err) {
                test.ok(false, err.message);
            })
            .finally(function() {
                test.done();
            });
    },

    testLoadFile: function(test) {
        var fileName = 'foobar';

        bigIp.load(fileName)
            .then(function() {
                test.strictEqual(icontrolMock.lastCall.body.options[0].file, fileName);
            })
            .catch(function(err) {
                test.ok(false, err.message);
            })
            .finally(function() {
                test.done();
            });
    },

    testLoadOptions: function(test) {
        var options = {
            foo: 'bar',
            hello: 'world'
        };

        bigIp.load(null, options)
            .then(function() {
                test.strictEqual(icontrolMock.lastCall.body.options[0].foo, options.foo);
                test.strictEqual(icontrolMock.lastCall.body.options[1].hello, options.hello);
            })
            .catch(function(err) {
                test.ok(false, err.message);
            })
            .finally(function() {
                test.done();
            });
    },

    testPing: {
        testPacketsReceived: function(test) {
            icontrolMock.when('create',
                              '/tm/util/ping',
                              {
                                  commandResult: "PING 104.219.104.168 (104.219.104.168) 56(84) bytes of data.\n64 bytes from 104.219.104.168: icmp_seq=1 ttl=240 time=43.5 ms\n\n--- 104.219.104.168 ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss, time 43ms\nrtt min/avg/max/mdev = 43.593/43.593/43.593/0.000 ms\n"
                              });
            bigIp.ping('1.2.3.4')
                .then(function() {
                    test.ok(true);
                })
                .catch(function(err) {
                    test.ok(false, err.message);
                })
                .finally(function() {
                    test.done();
                });
        },

        testNoPacketsReceived: function(test) {
            icontrolMock.when('create',
                              '/tm/util/ping',
                              {
                                  commandResult: "PING 1.2.3.4 (1.2.3.4) 56(84) bytes of data.\n\n--- 1.2.3.4 ping statistics ---\n2 packets transmitted, 0 received, 100% packet loss, time 2000ms\n\n"
                              });
            bigIp.ping('1.2.3.4', util.NO_RETRY)
                .then(function() {
                    test.ok(false, "Ping should have failed");
                })
                .catch(function() {
                    test.ok(true);
                })
                .finally(function() {
                    test.done();
                });
        },

        testUnknownHost: function(test) {
            icontrolMock.when('create',
                              '/tm/util/ping',
                              {
                                  commandResult: "ping: unknown host f5.com\n"
                              });
            bigIp.ping('1.2.3.4', util.NO_RETRY)
                .then(function() {
                    test.ok(false, "Ping should have failed");
                })
                .catch(function() {
                    test.ok(true);
                })
                .finally(function() {
                    test.done();
                });
        }
    },

    testReady: {
        setUp: function(callback) {
            bigIp.ready = realReady;

            icontrolMock.when(
                'list',
                '/shared/echo-js/available',
                {}
            );

            icontrolMock.when(
                'list',
                '/shared/identified-devices/config/device-info/available',
                {}
            );

            icontrolMock.when(
                'list',
                '/tm/sys/available',
                {}
            );

            icontrolMock.when(
                'list',
                '/tm/cm/available',
                {}
            );

            icontrolMock.when(
                'list',
                '/tm/sys/mcp-state/',
                {
                    entries: {
                        entry: {
                            nestedStats: {
                                entries: {
                                    phase: {
                                        description: 'running'
                                    }
                                }
                            }
                        }
                    }
                }
            );

            callback();
        },

        testBasic: function(test) {
            bigIp.ready(util.NO_RETRY)
                .then(function() {
                    test.ok(true);
                })
                .catch(function(err) {
                    test.ok(false, err);
                })
                .finally(function() {
                    test.done();
                });
        },

        testAvailabilityFail: function(test) {
            icontrolMock.fail(
                'list',
                '/shared/echo-js/available'
            );

            bigIp.ready(util.NO_RETRY)
                .then(function() {
                    test.ok(false, "Ready should have failed availability.");
                })
                .catch(function() {
                    test.ok(true);
                })
                .finally(function() {
                    test.done();
                });
        },

        testMcpNotReady: function(test) {
            icontrolMock.when(
                'list',
                '/tm/sys/mcp-state/',
                {
                    entries: {
                        entry: {
                            nestedStats: {
                                entries: {
                                    phase: {
                                        description: 'foo'
                                    }
                                }
                            }
                        }
                    }
                }
            );

            bigIp.ready(util.NO_RETRY)
                .then(function() {
                    test.ok(false, "Ready should have failed MCP check.");
                })
                .catch(function() {
                    test.ok(true);
                })
                .finally(function() {
                    test.done();
                });
        }
    },

    testTransaction: {

        testBasic: function(test) {
            var commands = [
                {
                    method: 'list',
                    path: '/foo/bar'
                },
                {
                    method: 'create',
                    path: '/bar/foo',
                    body: {
                        foo: 'bar'
                    }
                }
            ];

            var transId = '1234';

            icontrolMock.when('create',
                              '/tm/transaction/',
                              {
                                  transId: transId
                              });

            icontrolMock.when('modify',
                              '/tm/transaction/' + transId,
                              {
                                  state: 'COMPLETED'
                              }
                              );

            bigIp.transaction(commands)
                .then(function() {
                    test.strictEqual(icontrolMock.getRequest('list', '/foo/bar'), null);
                    test.deepEqual(icontrolMock.getRequest('create', '/bar/foo'), {foo: 'bar'});
                    test.deepEqual(icontrolMock.getRequest('modify', '/tm/transaction/1234'), { state: 'VALIDATING' });
                })
                .catch(function(err) {
                    test.ok(false, err);
                })
                .finally(function() {
                    test.done();
                });
        },

        testIncomplete: function(test) {
            var commands = [
                {
                    method: 'list',
                    path: '/foo/bar'
                }
            ];

            var transId = '1234';

            icontrolMock.when('create',
                              '/tm/transaction/',
                              {
                                  transId: transId
                              });

            icontrolMock.when('modify',
                              '/tm/transaction/' + transId,
                              {
                                  state: 'FOOBAR'
                              }
                              );

            bigIp.transaction(commands)
                .then(function() {
                    test.ok(false, "Transaction should have rejected incomplete");
                })
                .catch(function(err) {
                    test.notStrictEqual(err.indexOf('not completed'), -1);
                })
                .finally(function() {
                    test.done();
                });
        }
    }
};