const Hapi = require('hapi');
const Marko = require('marko');
const Path = require('path');
const Inert = require('inert');
const Vision = require('vision');
const Joi = require('joi');
// const Relish = require('relish')({
//     messages: {
//         'data.username': 'Please enter en email',
//         'data.password': 'Password is required'
//     }
// })
const Bcrypt = require('bcrypt');
const HapiAuthCookie = require('hapi-auth-cookie');
const AuthStrategy = require('./config/auth-strategy');
const Users = require('./data/users');
require('marko/node-require');

const logOptions = {
	ops: {
		interval: 1000
	},
	reporters: {
		myConsoleReporter: [
			{
				module: 'good-squeeze',
				name: 'Squeeze',
				args: [
					{
						log: '*',
						response: '*'
					}
				]
			},
			{
				module: 'good-console'
			},
			'stdout'
		],

		myHTTPReporter: [
			{
				module: 'good-squeeze',
				name: 'Squeeze',
				args: [
					{
						error: '*'
					}
				]
			}
		]
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
		request: [ 'error' ],
		log: [ 'error' ]
	}
});

const start = async () => {
	await server.register(Inert);
	await server.register(Vision);
	await server.register(HapiAuthCookie);
	await server.register({
		plugin: require('good'),
		logOptions
	});
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
	/***AUTHENTICATION***/
	// server.auth.strategy('basic', 'cookie', AuthStrategy);
	// server.auth.default({
	//     strategy: 'basic',
	//     mode: 'try'
	// });

	/*** ERROR HANDLING ***/
	// server.ext('onPreResponse', function (request, h) {
	//     const response = request.response;
	//     // if there's no Boom error, don't bother checking further down
	//     if (!response.isBoom) {
	//         return h.continue;
	//     }
	//     //let's handle login POST error
	//     if (request.route.path == '/login' && request.route.method == 'post') {
	//         //these 3 convoluted expressions below set the error flags for the login.marko template
	//         //I'll need to make this less complex
	//         const isUserNameEmpty = response.details.find((x) => {
	//             if (x.message === '"username" is not allowed to be empty') {
	//                 return true;
	//             }
	//             return false;
	//         }) !== undefined;

	//         const isUserNameEmail = response.details.find((x) => {
	//             if (x.message === '"username" must be a valid email') {
	//                 return true;
	//             }
	//             return false;
	//         }) !== undefined;

	//         const isPasswordEmpty = response.details.find((x) => {
	//             if (x.message === '"password" is not allowed to be empty') {
	//                 return true;
	//             }
	//             return false;
	//         }) !== undefined;
	//         return h.view('login', {
	//             isUserNameEmpty:isUserNameEmpty,
	//             isUserNameEmail: isUserNameEmail,
	//             isPasswordEmpty: isPasswordEmpty
	//         });
	//     }

	//     //handle 404 error
	//     if (response.output.statusCode == '404') {
	//         return h.view('404');
	//     };

	//     return h.continue;
	// });

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
	}); //end views

	server.route({
		path: '/',
		method: 'GET',
		options: {
			// auth: {
			//     strategy: 'basic',
			//     mode: 'required'
			// }
		},
		handler: (req, h) => {
			return h.view('index', {
				title: 'Marko!!'
			});
		}
	});

	server.route({
		path: '/page1/{depth}',
		method: 'GET',
		options: {
			// auth: {
			//     strategy: 'basic',
			//     mode: 'required'
			// }
		},
		handler: (req, h) => {
			const depth = req.params.depth;
			return h.view('page1', {
				depth: depth
			});
		}
	});

	server.route({
		path: '/page2/{depth}',
		method: 'GET',
		options: {
			// auth: {
			//     strategy: 'basic',
			//     mode: 'required'
			// }
		},
		handler: (req, h) => {
			const depth = req.params.depth;
			return h.view('page2', {
				depth: depth
			});
		}
	});

	server.route({
		path: '/page3/{depth}',
		method: 'GET',
		options: {
			// auth: {
			//     strategy: 'basic',
			//     mode: 'required'
			// }
		},
		handler: (req, h) => {
			const depth = req.params.depth;
			return h.view('page3', {
				depth: depth
			});
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
	}); //end route

	await server.start();
	console.log(`Hapi server started on %s`, server.info.uri);
	//for browser-refresh
	if (process.send) {
		process.send({
			event: 'online',
			url: 'http://localhost:3030/page1/0'
		});
	}
};

start();
