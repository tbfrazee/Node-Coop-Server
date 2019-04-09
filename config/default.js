//Default config options for coop server
//Do not change these values.  Change options in the config.js file instead to overwrite.

var config = module.exports = {};

config.env = "production";
config.hostname = "localhost";
config.port = 3000;

config.serverShortName = "Coop";
config.serverPrettyName = "Our Babysitting Coop";

config.useSSL = true;
config.sslCertFile = "./ssl/cert.pem";
config.sslKeyFile = "./ssl/key.pem";

config.dbType = 'better-sqlite3';
config.dbScript = './db_scripts/better-sqlite3.js';
config.dbOptions = {
	dbName: 'coop_database',
	dbPath: './db'
}

config.cookie = {
	secret: "86753OhNein",
	httpOnly: true,
	domain: config.hostname
};