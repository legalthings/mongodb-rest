'use strict';
//
// Integration tests for authentication.
//

var test = require('./testutils');

describe('mongodb-rest', function () {

    var authDbName = 'mongodb_rest_test_auth';
    var authDbConnectionString = "mongodb://localhost/" + authDbName;
    var usersCollectionName = "users";
    var baseUrl = 'http://localhost:3000/';

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
        collectionOutputType: 'json',
        auth: {
            usersDBConnection: authDbConnectionString,
            tokenDBConnection: authDbConnectionString,
            universalAuthToken: "universal-token",

        },
    };

    describe('login', function () {

        var loginUrl = baseUrl + "login";

        it('error when user not specified', function (done) {
            test.startServer(defaultConfiguration)
                .then(function () {
                    return test.dropDatabase(authDbName);
                })
                .then(function () {
                    // Login request.
                    return test.post(baseUrl + 'login', {
                        password: 'password-that-doesnt-matter',
                    });
                })
                .then(function (result) {
                    expect(result.response.statusCode).toBe(400);
                    done();                    
                })
                .catch(function (err) {
                    done(err);
                })
                .done(function() {
                    test.stopServer();    
                });
        });

        it('error when password not specified', function (done) {
            test.startServer(defaultConfiguration)
                .then(function () {
                    return test.dropDatabase(authDbName);
                })
                .then(function () {
                    // Login request.
                    return test.post(baseUrl + 'login', {
                        email: 'email-that-doesnt-matter',
                    });
                })
                .then(function (result) {
                    expect(result.response.statusCode).toBe(400);
                    done();                    
                })
                .catch(function (err) {
                    done(err);
                })
                .done(function() {
                    test.stopServer();    
                });
        });

        it("fails when the user doesn't exist", function (done) {

            test.startServer(defaultConfiguration)
                .then(function () {
                    return test.dropDatabase(authDbName);
                })
                .then(function () {
                    // Login request.
                    return test.post(baseUrl + 'login', {
                        email: 'user-that-doesnt-exist',
                        password: 'password-that-doesnt-matter',
                    });
                })
                .then(function (result) {
                    expect(result.response.statusCode).toBe(404);
                    done();                    
                })
                .catch(function (err) {
                    done(err);
                })
                .done(function() {
                    test.stopServer();    
                });
        });

        it("fails when password isn't correct", function (done) {
            var userName = 'some-user';

            test.startServer(defaultConfiguration)
                .then(function () {
                    // Load user into auth db.
                    return test.dropDatabaseAndLoadFixture(authDbName, usersCollectionName, [
                            {
                                email: userName,
                                password: 'the-correct-password',
                            }
                    ]);
                })
                .then(function () {
                    // Login request.
                    return test.post(baseUrl + 'login', {
                        email: userName,
                        password: 'the-incorrect-password',
                    });
                })
                .then(function (result) {
                    expect(result.response.statusCode).toBe(401);
                    done();                    
                })
                .catch(function (err) {
                    done(err);
                })
                .done(function() {
                    test.stopServer();    
                });
        });

        it("can login when there is no existing token", function (done) {

            var userName = 'some-user';
            var password = 'some-password';

            test.startServer(defaultConfiguration)
                .then(function () {
                    // Load user into auth db.
                    return test.dropDatabaseAndLoadFixture(authDbName, usersCollectionName, [
                            {
                                email: userName,
                                password: password,
                            }
                    ]);
                })
                .then(function () {
                    // Login request.
                    return test.post(baseUrl + 'login', {
                        email: userName,
                        password: password,
                    });
                })
                .then(function (result) {
                    expect(result.response.statusCode).toBe(200);
                    done();                    
                })
                .catch(function (err) {
                    done(err);
                })
                .done(function() {
                    test.stopServer();    
                });

        });
    });

/*
    describe("get collection", function () {
        it("can't get with no token", function (done) {
            done();
        });

        it("can't get with invalid token", function (done) {
            done();
        });

        it("can get with valid token", function (done) {
            done();
        });

        it("can get with universal auth token", function (done) {
            done();
        });
    });

    describe("post", function () {
        it("can't post with no token", function (done) {
            done();
        });

        it("can't post with invalid token", function (done) {
            done();
        });

        it("can post with valid token", function (done) {
            done();
        });

        it("can post with universal auth token", function (done) {
            done();
        });
    });

    describe("logout", function () {
        it("when logged in", function (done) {
            done();
        });

        it("when not logged in", function (done) {
            done();
        });
    });
*/
});