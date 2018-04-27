const Users = require('../data/users');
module.exports = {
        password: "93pm9DBL3gjhgghjjgjhggJVDhq4TMhWTJSP7M68nRrP5",
        cookie: "session",
        isSecure: false,
        redirectTo: '/login',
        redirectOnTry: false,
        validateFunc: (request, cookie) => {
            const user = Users[cookie.username]
            return {valid: user !== undefined, credentials: user}
        }
    };