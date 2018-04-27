const Hapi = require('hapi')
const Marko = require('marko')
const Path = require('path')
const Inert = require('inert')
const Vision = require('vision')
const Joi = require('joi')
// const Relish = require('relish')({
//     messages: {
//         'data.username': 'Please enter en email',
//         'data.password': 'Password is required'
//     }
// })
const Bcrypt = require('bcrypt')
const HapiAuthCookie = require('hapi-auth-cookie')
const AuthStrategy = require('./config/auth-strategy')
const Users = require('./data/users')
require('marko/node-require')

const logOptions = {
    ops: {
        interval: 1000
    },
    reporters: {
        myConsoleReporter: [{
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{
                log: '*',
                response: '*'
            }]
        }, {
            module: 'good-console'
        }, 'stdout'],

        myHTTPReporter: [{
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{
                error: '*'
            }]
        }]
    }
};

const loginSchema = {
    username: Joi.string().email().required(),
    password: Joi.string().required()
};

const server = Hapi.server({
    port: 3030,
    routes: {
        files: {
            relativeTo: Path.join(__dirname, 'public')
        }
    },
    debug: {
        request: ['error'],
        log: ['error']
    }
});

const start = async() => {
    await server.register(Inert)
    await server.register(Vision)
    await server.register(HapiAuthCookie)
    await server.register({
        plugin: require('good'),
        logOptions
    })
    //This is only needed if I want to change the view engine to handlebars
    // server.views({
    //     relativeTo: Path.join(__dirname, 'views'),
    //     engines: {
    //         hbs: require('handlebars')
    //     },
    //     isCached: false,
    //     //layout: true,
    //     partialsPath: 'partials',
    //     helpersPath: 'helpers'
    // })

    server.auth.strategy('basic', 'cookie', AuthStrategy);
    server.auth.default({
        strategy: 'basic',
        mode: 'try'
    });

    //error handling
    server.ext('onPreResponse', function (request, h) {
        const response = request.response;
        // if there's no Boom error, don't bother checking further down
        if (!response.isBoom) {
            return h.continue;
        }
        //let's handle login POST error
        if (request.route.path == '/login' && request.route.method == 'post') {
            //these 3 convoluted expressions below set the error flags for the login.marko template
            //I'll need to make this less complex
            const isUserNameEmpty = response.details.find((x) => {
                if (x.message === '"username" is not allowed to be empty') {
                    return true;
                }
                return false;
            }) !== undefined;

            const isUserNameEmail = response.details.find((x) => {
                if (x.message === '"username" must be a valid email') {
                    return true;
                }
                return false;
            }) !== undefined;

            const isPasswordEmpty = response.details.find((x) => {
                if (x.message === '"password" is not allowed to be empty') {
                    return true;
                }
                return false;
            }) !== undefined;
            return h.view('login', {
                isUserNameEmpty:isUserNameEmpty,
                isUserNameEmail: isUserNameEmail,
                isPasswordEmpty: isPasswordEmpty
            });
        }

        //handle 404 error 
        if (response.output.statusCode == '404') {
            return h.view('404');
        };

        return h.continue;
    });

    server.views({
        relativeTo: __dirname,
        engines: {
            marko: {
                compile: (src, options) => {

                    const opts = {
                        preserveWhitespace: true,
                        writeToDisk: false
                    };
                    const template = Marko.load(options.filename, opts);
                    return (context) => {
                        return template.renderToString(context);
                    };
                }
            }
        },
        path: 'templates',
        context: (request) => {
            return {
                user: request.auth.credentials
            };

        }
    }) //end views

    server.route({
        path: '/',
        method: 'GET',
        options: {
            auth: {
                strategy: 'basic',
                mode: 'required'
            }
        },
        handler: (req, h) => {
            return h.view('index', {
                title: "Marko!!"
            })
        }
    })

    server.route({
        path: '/user',
        method: 'GET',
        options: {
            auth: {
                strategy: 'basic',
                mode: 'required'
            }
        },
        handler: (req, h) => {
            return h.view('user', {
                title: "User!!"
            })
        }
    })

    server.route({
        path: '/login',
        method: 'GET',
        handler: (req, h) => {
            return h.view('login', {
                isUserNameEmpty: false,
                isUserNameEmail: false,
                isPasswordEmpty: false
            });
        }
    });

    server.route({
        path: '/login',
        method: 'POST',
        config: {
            validate: {
                options: {
                    abortEarly: false
                },
                payload: loginSchema,
                failAction: (request, h, err) => {
                    throw err;
                    return;
                }
            }
        },
        handler: async(req, h) => {
            const {
                username,
                password
            } = req.payload;
            const user = Users[username];
            if (!user || !await Bcrypt.compare(password, user.password)) {
                console.log("Hacker alert!");
                return h.redirect('/login');
            }
            req.cookieAuth.set({
                username
            })
            return h.redirect('/');
        }
    });

    //serving static files
    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: '.',
                redirectToSlash: true,
                index: true
            }
        }
    }) //end route

    await server.start();
    console.log(`Hapi server started on %s`, server.info.uri);
    //for browser-refresh
    if (process.send) {
        process.send({
            event: 'online',
            url: 'http://localhost:3030/'
        });
    }
};

start();