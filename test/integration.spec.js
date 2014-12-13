'use strict';

//
// Integration tests for mongodb-rest.
//

var utils = require('./testutils');

var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID;

var load = utils.loadFixture;
var dropAndLoad = utils.dropDatabaseAndLoadFixture;
var dropDatabase = utils.dropDatabase;
var requestHttp = utils.requestHttp;
var requestJson = utils.requestJson;
var collectionJson = utils.collectionJson;
var itemJson = utils.itemJson;
var itemHttp = utils.itemHttp;
var post = utils.post;
var put = utils.put;
var del = utils.del;
var Q = require('q');
var extend = require("extend");

describe('mongodb-rest', function () {

    // Default configuration to use for some tests.
    var defaultConfiguration = {
        db: {
            port: 27017,
            host: "localhost"
        },
        server: {
            port: 3000,
            address: "0.0.0.0"
        },
        accessControl: {
            allowOrigin: "*",
            allowMethods: "GET,POST,PUT,DELETE,HEAD,OPTIONS"
        },
        mongoOptions: {
            serverOptions: {
            },
            dbOptions: {
                w: 1
            }
        },
        debug: true,
        humanReadableOutput: true,
        collectionOutputType: 'json'
    };

    var restServer = require('../server');

    var init = function (config, started) {

        // Open the rest server for each test.        
        restServer.startServer(config, started);
    };

    afterEach(function () {

        // Close the rest server after each test.
        restServer.stopServer();
    });

    it('can start server without server options', function (done) {

        var configurationNoServer = extend(true, {}, defaultConfiguration);
        delete configurationNoServer.server;

        expect(function () {
            init(configurationNoServer, done);
        }).not.toThrow();
    });
    it('can start server without server host or port', function (done) {

        var configurationNoServer = extend(true, {}, defaultConfiguration);
        delete configurationNoServer.server.address;
        delete configurationNoServer.server.port;

        expect(function () {
            init(configurationNoServer, done);
        }).not.toThrow();
    });

    it('can hit server without db options', function (done) {

        var configurationNoDb = extend(true, {}, defaultConfiguration);
        delete configurationNoDb.db.host;
        delete configurationNoDb.db.port;

        init(configurationNoDb, done);

        var testDbName = utils.genTestDbName();
        var testCollectionName = utils.genTestCollectionName();

        dropAndLoad(testDbName, testCollectionName, [])
            .then(function () {
                return collectionJson(utils.genCollectionUrl(testDbName, testCollectionName));
            })
            .then(function (result) {
                expect(result.data).toEqual([])
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

    it('can retrieve names of databases', function (done) {

        init();

        var testDbName = utils.genTestDbName();

        dropDatabase(testDbName)
            .then(function () {
                return requestJson(utils.genDbsUrl());
            })
            .then(function (result) {                
                expect(result.data).not.toContain(testDbName);
            })
            .then(function () {
                return dropAndLoad(testDbName, utils.genTestCollectionName(), []);
            })
            .then(function () {
                return requestJson(utils.genDbsUrl());
            })
            .then(function (result) {
                expect(result.data).toContain(testDbName);
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

    it('can retrieve names of collections', function (done) {

        init();

        var testcol1 = "testcol1";
        var testcol2 = "testcol2";

        var testDbName = utils.genTestDbName();
        var collectionsUrl = utils.genCollectionsUrl(testDbName);

        dropDatabase(testDbName)
            .then(function () {
                return requestJson(collectionsUrl);
            })
            .then(function (result) {                
                expect(result.data.length).toBe(0);
            })
            .then(function () {
                return load(testDbName, testcol1, [ { blah: 1 } ]);
            })
            .then(function () {
                return load(testDbName, testcol2, [ { blah: 2 } ]);
            })
            .then(function () {
                return requestJson(collectionsUrl);
            })
            .then(function (result) {
                var collectionNames = result.data;
                expect(collectionNames.length).toBeGreaterThan(1);
                expect(collectionNames).toContain(testcol1);
                expect(collectionNames).toContain(testcol2);
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();

    });

    it('should retreive empty array from empty db collection', function (done) {

        init();

        var testDbName = utils.genTestDbName();
        var testCollectionName = utils.genTestCollectionName();

        dropAndLoad(testDbName, testCollectionName, [])
            .then(function () {
                return collectionJson(utils.genCollectionUrl(testDbName, testCollectionName));
            })
            .then(function (result) {
                expect(result.data).toEqual([])
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

    it('can retreive array from db collection', function (done) {

        init();

        var testData = [
            {
                item: 1,
            },
            {
                item: 2,
            },
            {
                item: 3,
            },
        ];

        var testDbName = utils.genTestDbName();
        var testCollectionName = utils.genTestCollectionName();

        dropAndLoad(testDbName, testCollectionName, testData)
            .then(function () {
                return collectionJson(utils.genCollectionUrl(testDbName, testCollectionName));
            })
            .then(function (result) {
                var data = result.data;
                expect(data.length).toBe(3);
                data.sort(function (a, b) { return a.item-b.item; }); // Sort results, can't guarantee order otherwise.
                expect(data[0].item).toBe(1);
                expect(data[1].item).toBe(2);
                expect(data[2].item).toBe(3);
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

    it('can handle retreiving document from empty db collection', function (done) {

        init();

        var testDbName = utils.genTestDbName();
        var testCollectionName = utils.genTestCollectionName();

        dropAndLoad(testDbName, testCollectionName, [])
            .then(function () {
                var itemID = ObjectID();
                return itemJson(utils.genCollectionUrl(testDbName, testCollectionName), itemID);
            })
            .then(function (result) {
                expect(result.response.statusCode).toBe(404);
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

    it('can handle retreiving non-existent document from non-empty db collection', function (done) {

        init();

        var itemID = ObjectID();

        var testData = [
            {
                _id: ObjectID(),
                item: 1,
            },
            {
                _id: ObjectID(),
                item: 2,
            },
            {
                _id: ObjectID(),
                item: 3,
            },
        ];

        var testDbName = utils.genTestDbName();
        var testCollectionName = utils.genTestCollectionName();

        dropAndLoad(testDbName, testCollectionName, [])
            .then(function () {
                return itemHttp(utils.genCollectionUrl(testDbName, testCollectionName), itemID);
            })
            .then(function (result) {
                expect(result.response.statusCode).toBe(404);
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

   it('can retreive csv format data from db collection', function (done) {

        var csvConfiguration = extend(true, {}, defaultConfiguration);
        csvConfiguration.collectionOutputType = 'csv';

        init(csvConfiguration);

        var testData = [
            {
                item: 1,
            },
            {
                item: 2,
            },
            {
                item: 3,
            },
        ];

        var testDbName = utils.genTestDbName();
        var testCollectionName = utils.genTestCollectionName();

        dropAndLoad(testDbName, testCollectionName, testData)
            .then(function () {
                return requestHttp(utils.genCollectionUrl(testDbName, testCollectionName));
            })
            .then(function (result) {
                var lines = result.data.trim().split('\r\n');
                expect(lines.length).toBe(4);

                var headerRow = lines[0].split(',');
                var idIndex = 0;
                var itemIndex = 1;
                if (headerRow[0] !== "\"_id\"") {
                    idIndex = 1;
                    itemIndex = 0;
                } 

                expect(headerRow[itemIndex]).toEqual("\"item\"");
                expect(headerRow[idIndex]).toEqual("\"_id\"");

                lines.shift(); // Remove header line.
                var items = lines.map(function (line) {
                    var columns = line.split(',');
                    return {
                        item: parseInt(columns[itemIndex].substring(1,columns[itemIndex].length-1)),
                    };
                });

                items.sort(function (a, b) { return a.item-b.item; }); // Sort results, can't guarantee order otherwise.

                expect(items[0].item).toBe(1);
                expect(items[1].item).toBe(2);
                expect(items[2].item).toBe(3);
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

    it('can retreive csv format data via query param', function (done) {

        var csvConfiguration = extend(true, {}, defaultConfiguration);
        csvConfiguration.collectionOutputType = 'csv';

        init();

        var testData = [
            {
                item: 1,
            },
            {
                item: 2,
            },
            {
                item: 3,
            },
        ];

        var testDbName = utils.genTestDbName();
        var testCollectionName = utils.genTestCollectionName();

        dropAndLoad(testDbName, testCollectionName, testData)
            .then(function () {
                return requestHttp(utils.genCollectionUrl(testDbName, testCollectionName) + "?output=csv");
            })
            .then(function (result) {

                var lines = result.data.trim().split('\r\n');
                expect(lines.length).toBe(4);

                var headerRow = lines[0].split(',');
                var idIndex = 0;
                var itemIndex = 1;
                if (headerRow[0] !== "\"_id\"") {
                    idIndex = 1;
                    itemIndex = 0;
                } 

                expect(headerRow[itemIndex]).toEqual("\"item\"");
                expect(headerRow[idIndex]).toEqual("\"_id\"");

                lines.shift(); // Remove header line.
                var items = lines.map(function (line) {
                    var columns = line.split(',');
                    return {
                        item: parseInt(columns[itemIndex].substring(1,columns[itemIndex].length-1)),
                    };
                });

                items.sort(function (a, b) { return a.item-b.item; }); // Sort results, can't guarantee order otherwise.

                expect(items[0].item).toBe(1);
                expect(items[1].item).toBe(2);
                expect(items[2].item).toBe(3);
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

    it('can retreive single document from db collection', function (done) {

        init();

        var itemID = ObjectID();

        var testData = [
            {
                _id: ObjectID(),
                item: 1,
            },
            {
                _id: itemID,
                item: 2,
            },
            {
                _id: ObjectID(),
                item: 3,
            },
        ];

        var testDbName = utils.genTestDbName();
        var testCollectionName = utils.genTestCollectionName();

        dropAndLoad(testDbName, testCollectionName, testData)
            .then(function () {
                return itemJson(utils.genCollectionUrl(testDbName, testCollectionName), itemID);
            })
            .then(function (result) {
                expect(result.data._id).toEqual(itemID.toString());
                expect(result.data.item).toBe(2);
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

    it('can insert single document into collection', function (done) {

        init();

        var postData = {
            value: "hi there",
        };

        var testDbName = utils.genTestDbName();
        var testCollectionName = utils.genTestCollectionName();

        dropDatabase(testDbName)
            .then(function () {
                return post(utils.genCollectionUrl(testDbName, testCollectionName), postData);
            })
            .then(function (result) {
                expect(result.response.statusCode).toBe(201);
                expect(result.data).toEqual({ ok: 1 });

                return collectionJson(utils.genCollectionUrl(testDbName, testCollectionName));
            })
            .then(function (result) {
                expect(result.data.length).toBe(1);
                expect(result.data[0].value).toBe(postData.value);
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

    it('can update single document in db collection', function (done) {

        init();

        var itemID = ObjectID();

        var testData = [
            {
                _id: ObjectID(),
                item: 1,
            },
            {
                _id: itemID,
                item: 2,
            },
            {
                _id: ObjectID(),
                item: 3,
            },
        ];

        var testDbName = utils.genTestDbName();
        var testCollectionName = utils.genTestCollectionName();

        dropAndLoad(testDbName, testCollectionName, testData)
            .then(function () {

                var newData = {
                    item: 50,
                };

                return put(utils.genCollectionUrl(testDbName, testCollectionName), itemID, newData);
            })
            .then(function (result) {
                expect(result.response.statusCode).toBe(200);
                expect(result.data).toEqual({ ok: 1 });

                return itemJson(utils.genCollectionUrl(testDbName, testCollectionName), itemID);
            })
            .then(function (result) {
                expect(result.data._id).toEqual(itemID.toString());
                expect(result.data.item).toBe(50);
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

    it('can delete single document in db collection', function (done) {

        init();

        var itemID = ObjectID();

        var testData = [
            {
                _id: ObjectID(),
                item: 1,
            },
            {
                _id: itemID,
                item: 2,
            },
            {
                _id: ObjectID(),
                item: 3,
            },
        ];

        var testDbName = utils.genTestDbName();
        var testCollectionName = utils.genTestCollectionName();

        dropAndLoad(testDbName, testCollectionName, testData)
            .then(function () {
                return del(utils.genCollectionUrl(testDbName, testCollectionName), itemID);
            })
            .then(function (result) {
                expect(result.response.statusCode).toBe(200);
                expect(JSON.parse(result.data)).toEqual({ ok: 1 });

                return itemJson(utils.genCollectionUrl(testDbName, testCollectionName), itemID);
            })
            .then(function (result) {
                //todo: expect(result.response.statusCode).toBe(404);
                expect(result.data).toEqual({ ok: 0 });

                return collectionJson(utils.genCollectionUrl(testDbName, testCollectionName));
            })
            .then(function (result) {
                expect(result.data.length).toBe(2);
                done();
            })
            .catch(function (err) {
                done(err);
            })
            .done();
    });

});