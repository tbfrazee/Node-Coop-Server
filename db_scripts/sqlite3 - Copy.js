const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database("./db/coop.db");

var config = require('../config/config.js');

function makeSelectSQL(request) {
	let SQL = "";
	if(!request.table) reject("Invalid request; table property is required");
	let colAlias = request.alias ? request.alias + "_" : "";
	SQL = "SELECT ";
	if(request.cols) {
		for(col in request.cols) {
			SQL += request.cols[col] + (colAlias ? " AS " + colAlias + request.cols[col]: "") + ", ";
		}
		SQL = SQL.substring(0, SQL.length - 2) + " "; //Remove trailing comma
	} else {
		SQL += "* ";
	}
	SQL += "FROM " + request.table + (request.alias ? " AS " + request.alias : "");
	
	if(request.join) {
		if(!Array.isArray(request.join)) {
			request.join = [request.join];
		}
		let acode = "a".charCodeAt(0);
		for(i = 0; i < request.join.length; i++) {
			let alias = request.join.alias ? request.join.alias : "join_" + String.fromCharCode(acode + i);
			let joinType = (request.join[i].joinType ? " " + request.join[i].joinType : "") + " JOIN ";
			let joinSQL = request.join[i].cols ? ("(" + makeSelectSQL(request.join[i]) + ")") : request.join[i].table;
			let joinOn = request.table + "." + request.join[i].on.col1 + (request.join[i].on.operator ? request.join[i].on.operator : " = ") + alias + "." + (request.join[i].alias ? request.join[i].alias + "_" : "") + request.join[i].on.col2;
			SQL += joinType + joinSQL + " AS " + alias + " ON " + joinOn;
		}
	}
	
	if(request.filter) {
		let groupedSQL = [];
		let filterSQL = [];
		SQL += " WHERE ";
		if(!Array.isArray(request.filter)) {
			request.filter = [request.filter];
		}
		
		//Push each filter into an array as SQL, indexed by group (or 0 if no group provided)
		for(i = 0; i < request.filter.length; i++) {
			let group = request.filter[i].group ? request.filter[i].group : 0;
			if(!Array.isArray(groupedSQL[group]))
				groupedSQL[group] = [];
			groupedSQL[group].push("(" + request.filter[i].col + (request.filter[i].operator ? " " + request.filter[i].operator + " " : " = ") + request.filter[i].value + ")");
			console.log(group + " : " + groupedSQL[group]);
		}
		
		//Turn each group into a single SQL string
		for(i = 0; i < groupedSQL.length; i++) {
			filterSQL[i] = "(";
			for(j = 0; j < groupedSQL[i].length; j++) {
				filterSQL[i] += groupedSQL[i][j];
				if(j < groupedSQL[i].length - 1)
					filterSQL[i] += (request.filterGroups && request.filterGroups[i]) ? " " + request.filterGroups[i] + " " : " AND ";
				else
					filterSQL[i] += ")";
			}
		}
		
		//Join groups together into a single WHERE clause
		for(i = 0; i < groupedSQL.length; i++) {
			SQL += filterSQL[i];
			if(i < groupedSQL.length - 1)
				SQL += (request.filterGroups && request.filterGroups[i + "_" + (i + 1)]) ? (" " + request.filterGroups[i + "_" + (i + 1)] + " ") : " AND "
		}
	}
	
	return SQL;
}

function makeInsertSQL(request) {
	let SQL = "INSERT INTO " + request.table;
	if(request.values) {
		let cols = [];
		let vals = [];
		SQL += " (";
		for(col in values) {
			cols.push(col);
			if(typeof values[col] === 'object') {
				vals.push(JSON.stringify(values[col]));
			} else {
				vals.push("$" + values[col]);
			}
		}
		SQL += " (" + cols.join(",") + ") VALUES (" + vals.join(",") + ")";
	} else {
		SQL += " DEFAULT VALUES";
	}
	SQL += ";";
	return SQL;
}

module.exports = {
	
	test: function(request) {
		return makeSelectSQL(request);
	},
	
	isSQL: true,
	
	makeCookieStore: function(session) {
		let connectSQLite3 = require('connect-sqlite3')(session);
		let store = new connectSQLite3({
			table: "Sessions",
			db: 'coop.db',
			dir: "./db"
		});
		return store;
	},
	
	ensureDBSchema: function() {
		db.parallelize(() => {
			db.run(`CREATE TABLE IF NOT EXISTS Users (
				id VARCHAR PRIMARY KEY,
				familyId VARCHAR NOT NULL,
				firstName VARCHAR,
				lastName VARCHAR,
				bio VARCHAR,
				email VARCHAR,
				phone VARCHAR,
				contactPref VARCHAR,
				training VARCHAR
				);`
			);
			db.run(`CREATE TABLE IF NOT EXISTS Families (
				familyId INTEGER PRIMARY KEY AUTOINCREMENT,
				address VARCHAR,
				household VARCHAR,
				emergencyContacts VARCHAR,
				adults VARCHAR,
				children VARCHAR,
				pets VARCHAR
			);`	
			);
			db.run(`CREATE TABLE IF NOT EXISTS Requests (
				requestId INTEGER PRIMARY KEY AUTOINCREMENT,
				requestedBy VARCHAR NOT NULL,
				startTime INTEGER NOT NULL,
				endTime INTEGER NOT NULL,
				children VARCHAR NOT NULL,
				comment VARCHAR,
				assignedTo VARCHAR,
				fulfilledStartTime INTEGER,
				fulfilledEndTime INTEGER
			);`
			);
			db.run(`CREATE TABLE IF NOT EXISTS Balances (
				familyId INTEGER PRIMARY KEY,
				balance REAL
			);`
			);
			db.run(`CREATE TABLE IF NOT EXISTS Children (
				childId INTEGER PRIMARY KEY AUTOINCREMENT,
				familyId VARCHAR,
				name VARCHAR,
				gender VARCHAR,
				birthdate INTEGER,
				medicalContact VARCHAR,
				medicalConditions VARCHAR,
				medications VARCHAR,
				medicationAllergies VARCHAR,
				foodAllergies VARCHAR,
				otherAllergies VARCHAR,
				miscMedical VARCHAR,
				behavior VARCHAR,
				mealRoutine VARHCAR,
				bedRoutine VARCHAR
			);`
			);
		});
	},
	
	get: function(request, params) {
		return new Promise(function(resolve, reject) {
			let SQL;
			if(request instanceof Object) {
				SQL = makeSelectSQL(request) + ";";
			} else if(request instanceof String) {
				SQL = request;
			} else {
				reject({error: "Invalid request; must be object or string"});
			}
			db.all(SQL, params, (err, rows) => {
				if(err) return reject(err.message);
				else return resolve(rows);
			});
		});
	},
	
	runSQL: function(SQL) {
		return new Promise(function(resolve, reject) {
			db.run(SQL, function(err) {
				if(err) {
					return reject(err.message);
				} else {
					return resolve(this.changes);
				}
			});
		});
	},
	
	insert: function(request) {
		return new Promise(function(resolve, reject) {
			let SQL;
			if(table) {
				SQL = makeInsertSQL(request);
				
				db.run(SQL, function(err) {
					if(err) {
						return reject(err.message);
					} else {
						return resolve(this.changes);
					}
				});
			} else {
				return reject("Table name is required.");
			}
		});
	},
	
	//batchInsert takes either a single array of objects as its argument or any number of objects.
	//Each object should have two keys: (String)table - the table name - and (Object)values - an object that contains key:value pairs to insert
	batchInsert: function() {
		let params = [];
		if(Array.isArray(arguments[0])) {
			params = arguments[0];
		} else {
			params = arguments;
		}
		
		if(params.length == 0) {
			return;
		}
		
		return new Promise(function(resolve, reject) {
			let SQL = "BEGIN TRANSACTION;";
			for(i = 0; i < params.length; i++) {
				if(params[i].table && params[i].values) {
					SQL += makeInsertSQL(params.table, params.values);
				}
			}
			SQL += "COMMIT;";
			
			db.run(SQL, function(err) {
				if(err) {
					return reject(err.message);
				} else {
					return resolve(this.changes);
				}
			});
		});
	},
	
	//Update
	//To avoid mistakes, filter must be defined.  Pass in an empty object to update every row in the table.
	update: function(table, cols, values, filter) {
		return new Promise(function(resolve, reject) {
			let SQL;
			if(table && values && filter) {
				SQL = "UPDATE " + table + " SET ";
				for(col in values) {
					SQL += col + "=" + (typeof values[col] === 'object' ? JSON.stringify(values[col]) : values[col]) + ", ";
				}
				SQL = SQL.substring(0, SQL.length - 2) + " "; //Remove trailing comma
				if(!Array.isArray(filter)) {
					if(Object.keys(filter).length > 0) {
						filter = [filter];
					} else {
						filter = undefined;
					}
				}
				if(filter) {
					SQL += "WHERE ";
					for(i = 0; i < request.filter.length; i++) {
						if(request.filter[i] && request.filter[i].col && request.filter[i].value) {
							if(i > 0) {
								SQL += request.filter[i].isOr ? " OR " : " AND ";
							}
							SQL += "(" + filter.col + filter.operator ? filter.operator : "=" + filter.value + ")";
						}
					}
				}
				SQL += ";";
				
				db.run(SQL, function(err) {
					if(err) {
						return reject(err.message);
					} else {
						return resolve(this.changes);
					}
				});
			} else {
				return reject("Table name, values (as col:val JSON), and filter (pass in {} for no filter) are required.");
			}
		});
	},
}