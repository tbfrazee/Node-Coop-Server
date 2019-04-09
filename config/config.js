//Config options for coop server
//Defaults are shown commented
//Uncomment and change as needed

//At the very least, be sure to set a secure cookie secret

//Load defaults
var config = require('./default.js');

/**
 * config.fbGroupId
 * CHANGE TO: The numeric Facebook entity ID of your group
 * THIS VALUE IS REQUIRED
 */
config.fbGroupId = 2337563949617597;

/**
 * config.fbGroupName
 * CHANGE TO: The display name of your Facebook group
 */
config.fbGroupName = "Littlists' Babysitting Coop";

/**
 * config.hostname
 * DEFAULT: 'localhost'
 * CHANGE TO: The hostname of your server
 */
//config.hostname = "localhost";

/**
 * config.env
 * OPTIONS: 'dev': print full stack traces on error; 'production': prettier error output
 */
//config.env = "production";

/**
 * config.port
 * CHANGE TO: The port that you want your server to run on
 */
//config.port = 3000;

/**
 * config.serverShortName
 * CHANGE TO: A brief name without spaces or special characters that describes your site (used for titlebars and whatnot)
 */
//config.serverShortName = "Coop";

/**
 * config.serverPrettyName
 * CHANGE TO: A display name that describes your site
 */
config.serverPrettyName = "Littlists' Babysitting Coop";

/**
 * config.useSSL
 * Whether or not to use SSL encryption (HTTPS)
 * If true, this requires that config.sslCertFile and config.sslKeyFile are set
 * CHANGE TO: True to use SSL, false to not
 */
//config.useSSL = true;

/**
 * config.sslCertFile
 * The cert file to use for SSL encryption
 * CHANGE TO: The path to your SSL cert file
 */
//config.sslCertFile = "./ssl/cert.pem";

/**
 * config.sslKeyFile
 * The private key file to use for SSL encryption
 * CHANGE TO: The path to your SSL private key file
 */
//config.sslKeyFile = "./ssl/key.pem";

/**
 * config.sslPasswordStr
 * A string password for SSL files
 * CHANGE TO: The password for your SSL files, or leave undefined if no password
 */
config.sslPasswordStr = "password";

/**
 * config.sslPasswordFile
 * The path to a text file containing the password for SSL files
 * Not used if config.sslPasswordStr is defined
 * CHANGE TO: The path to a text file containing the password for your SSL files, or leave undefined if no password
 */
//config.sslPasswordFile = undefined;

/**
 * config.dbType
 * OPTIONS: Currently only 'better-sqlite3' is supported. Support for more database types is planned.
 */
config.dbType = 'better-sqlite3';

/**
 * config.dbScript
 * Path to the script implementing database methods, relative to the server script
 * This option should not have to be changed unless you implement your own dbType
 * Leave this uncommented if you changed config.dbType
 */
config.dbScript = './db_scripts/' + config.dbType + '.js';

/**
 * config.dbOptions
 * Additional options needed to connect to your database
 * Common options include dbName, dbPath, user, password, host, region
 * See ../dbScripts/{YOUR DATABASE TYPE}.js for how the options are used
 */
//config.dbOptions = {
//	dbName: 'coop_database',
//	dbPath: './'
//}

/**
 * config.cookie
 * Cookie options for session management
 * At the very least, set config.cookie.secret to something...well, secret. And secure. And cryptographically long.
 */
//config.cookie = {
//	secret: "86753OhNein",
//	httpOnly: true,
//	domain: config.hostname
//};

module.exports = config;