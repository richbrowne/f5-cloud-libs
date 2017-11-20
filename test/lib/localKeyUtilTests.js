/**
 * Copyright 2017 F5 Networks, Inc.
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

const q = require('q');
const fsMock = require('fs');

const realExit = process.exit;
const realWriteFile = fsMock.writeFile;

var childProcessMock;
var cryptoUtilMock;
var localKeyUtil;

var dirCreated;
var keyPairGenerated;
var bigIpFolderCreated;

var publicKeyDirctory = 'myPublicKeyDir';
var publicKeyOutFile = 'myPublicKeyOutFile';
var privateKeyFolder = 'myPrivateKeyFolder';
var privateKeyName = 'myPrivateKeyName';


module.exports = {
    setUp: function(callback) {
        childProcessMock = require('child_process');
        cryptoUtilMock = require('../../lib/cryptoUtil');
        localKeyUtil = require('../../lib/localKeyUtil');

        dirCreated = false;
        keyPairGenerated = false;
        bigIpFolderCreated = false;

        // Don't let script exit - we need the nodeunit process to run to completion
        process.exit = function() {};

        childProcessMock.exec = function(command, cb) {
            cb(null, null);
        };
        childProcessMock.execFile = function(file, cb) {
            cb();
        };
        cryptoUtilMock.generateKeyPair = function() {
            keyPairGenerated = true;
            return q();
        };

        cryptoUtilMock.encrypt = function() {
            return q();
        };
        cryptoUtilMock.generateRandomBytes = function() {
            return q();
        };

        fsMock.writeFile = function(file, data, options, cb) {
            cb();
        };
        fsMock.mkdir = function(dir, cb) {
            dirCreated = true;
            cb();
        };
        fsMock.access = function(file, cb) {
            cb();
        };

        callback();
    },

    tearDown: function(callback) {
        Object.keys(require.cache).forEach(function(key) {
            delete require.cache[key];
        });
        fsMock.writeFile = realWriteFile;
        process.exit = realExit;
        callback();
    },

    testGenerateAndInstallKeyPair: {
        testPrivateKeyCreated: function(test) {
            test.expect(1);
            localKeyUtil.generateAndInstallKeyPair(publicKeyDirctory, publicKeyOutFile, privateKeyFolder, privateKeyName)
                .then(function () {
                    test.ok(keyPairGenerated);
                })
                .catch(function(err) {
                    test.ok(false, err);
                })
                .finally(function() {
                    test.done();
                });
        },

        testPrivateKeyExists: function(test) {
            childProcessMock.exec = function(command, cb) {
                var result = 'ok';
                cb(null, result);
            };
            test.expect(1);
            localKeyUtil.generateAndInstallKeyPair(publicKeyDirctory, publicKeyOutFile, privateKeyFolder, privateKeyName)
                .then(function () {
                    test.ifError(keyPairGenerated);
                })
                .catch(function(err) {
                    test.ok(false, err);
                })
                .finally(function() {
                    test.done();
                });
        },

        testDirectoryCreated: function(test) {
            fsMock.access = function(file, cb) {
                cb(new Error());
            };

            test.expect(1);
            localKeyUtil.generateAndInstallKeyPair(publicKeyDirctory, publicKeyOutFile, privateKeyFolder, privateKeyName)
                .then(function () {
                    test.ok(dirCreated);
                })
                .catch(function(err) {
                    test.ok(false, err);
                })
                .finally(function() {
                    test.done();
                });
        },

        testDirectoryExists: function(test) {
            fsMock.access = function(file, cb) {
                cb();
            };

            test.expect(1);
            localKeyUtil.generateAndInstallKeyPair(publicKeyDirctory, publicKeyOutFile, privateKeyFolder, privateKeyName)
                .then(function () {
                    test.ifError(dirCreated);
                })
                .catch(function(err) {
                    test.ok(false, err);
                })
                .finally(function() {
                    test.done();
                });
        },

        testBigIpFolderCreated: function(test) {
            childProcessMock.exec = function(command, cb) {
                if (command.startsWith('/usr/bin/tmsh list sys folder')) {
                    cb(new Error());
                }
                else if (command.startsWith('/usr/bin/tmsh create sys folder')) {
                    bigIpFolderCreated = true;
                    cb(null, null);
                }
                else {
                    cb(null, null);
                }
            };

            test.expect(1);
            localKeyUtil.generateAndInstallKeyPair(publicKeyDirctory, publicKeyOutFile, privateKeyFolder, privateKeyName)
                .then(function () {
                    test.ok(bigIpFolderCreated);
                })
                .catch(function(err) {
                    test.ok(false, err);
                })
                .finally(function() {
                    test.done();
                });
        },

        testBigIpFolderExists: function(test) {
            childProcessMock.exec = function(command, cb) {
                if (command.startsWith('/usr/bin/tmsh list sys folder')) {
                    cb(null, null);
                }
                else if (command.startsWith('/usr/bin/tmsh create sys folder')) {
                    bigIpFolderCreated = true;
                    cb(null, null);
                }
                else {
                    cb(null, null);
                }
            };

            test.expect(1);
            localKeyUtil.generateAndInstallKeyPair(publicKeyDirctory, publicKeyOutFile, privateKeyFolder, privateKeyName)
                .then(function () {
                    test.ifError(bigIpFolderCreated);
                })
                .catch(function(err) {
                    test.ok(false, err);
                })
                .finally(function() {
                    test.done();
                });
        },

        testTempPrivateKeyRemoved: function(test) {
            var fileDeleted = false;
            fsMock.unlink = function(file, cb) {
                fileDeleted = true;
                cb();
            };

            test.expect(1);
            localKeyUtil.generateAndInstallKeyPair(publicKeyDirctory, publicKeyOutFile, privateKeyFolder, privateKeyName)
                .then(function () {
                    test.ok(fileDeleted);
                })
                .catch(function(err) {
                    test.ok(false, err);
                })
                .finally(function() {
                    test.done();
                });
        }
    },

    testGetPrivateKeyFilePath: function(test) {
        const folder = "hello";
        const name = "world";
        const suffix = "_1234_1";

        var shellOut = ":" + folder + ":" + name + ".key" + suffix;
        childProcessMock.exec = function(command, cb) {
            cb (null, shellOut);
        };

        test.expect(1);
        localKeyUtil.getPrivateKeyFilePath(folder, name)
            .then(function(path) {
                test.strictEqual(path, '/config/filestore/files_d/' + folder + '_d/certificate_key_d/:' + folder + ':' + name + '.key' + suffix);
            })
            .catch(function(err) {
                test.ok(false, err);
            })
            .finally(function() {
                test.done();
            });
    },

    testGetPrivateKeyMetadata: function(test) {
        const folder = "hello";
        const name = "world";
        const passphrase = 'foobar';

        var tmshOut = 'sys file ssl-key /CloudLibsLocal/cloudLibsLocalPrivate.key { passphrase ' + passphrase + ' security-type password }';
        childProcessMock.exec = function(command, cb) {
            cb (null, tmshOut);
        };

        test.expect(1);
        localKeyUtil.getPrivateKeyMetadata(folder, name)
            .then(function(metadata) {
                test.strictEqual(metadata.passphrase, passphrase);
            })
            .catch(function(err) {
                test.ok(false, err);
            })
            .finally(function() {
                test.done();
            });
    }
};
