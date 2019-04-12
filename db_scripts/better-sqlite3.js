const sqlite3 = require('better-sqlite3');
const db = new sqlite3("./db/coop.db");
const coop = require('../coop/models.js');

var config = require('../config/config.js');

function makeSelectSQL(request, isJoin) {
	let SQL = "";
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
            let joinSQL = request.join[i].cols ? ("(" + makeSelectSQL(request.join[i], true) + ")") : request.join[i].table;
            let joinOnLeft = typeof request.join[i].on.left == "object" ? "(" + makeSelectSQL(request.join[i].on.left) + ")" : request.table + "." + request.join[i].on.left;
            let joinOnRight = typeof request.join[i].on.right == "object" ? "(" + makeSelectSQL(request.join[i].on.right) + ")" : alias + "." + (request.join[i].alias ? request.join[i].alias + "_" : "") + request.join[i].on.right;
            let joinOn = joinOnLeft + (request.join[i].on.operator ? request.join[i].on.operator : " = ") + joinOnRight;
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
            let wLeft = "(" + request.filter[i].col;
            let wOp = request.filter[i].operator ? " " + request.filter[i].operator + " " : " = ";
            let wRight;
            if(wOp = " IN ") {
                wRight = "(";
                if(Array.isArray(request.filter[i].value)) {
                    for(let j = 0; j < request.filter[i].value.length; j++) {
                        if(typeof request.filter[i].value[j] === 'string')
                            request.filter[i].value[j] = "'" + request.filter[i].value[j] + "'";
                    }
                    wRight += request.filter[i].value.join(',') + '))';
                } else
                    wRight += request.filter[i].value + '))';
            } else
                wRight = request.filter[i].value + ")";
            groupedSQL[group].push(wLeft + wOp + wRight);
		}
		
		//Turn each group into a single SQL string
        for (i = 0; i < groupedSQL.length; i++) {
            if (groupedSQL[i]) {
                filterSQL[i] = "(";
                for (j = 0; j < groupedSQL[i].length; j++) {
                    filterSQL[i] += groupedSQL[i][j];
                    if (j < groupedSQL[i].length - 1)
                        filterSQL[i] += (request.filterGroups && request.filterGroups[i]) ? " " + request.filterGroups[i] + " " : " AND ";
                    else
                        filterSQL[i] += ")";
                }
            }
		}
		
		//Join groups together into a single WHERE clause
        for (i = 0; i < groupedSQL.length; i++) {
            if (groupedSQL[i]) {
                SQL += filterSQL[i];
                if (i < groupedSQL.length - 1)
                    SQL += (request.filterGroups && request.filterGroups[i + "_" + (i + 1)]) ? (" " + request.filterGroups[i + "_" + (i + 1)] + " ") : " AND ";
            }
		}
	}
	
	if(request.group)
		SQL += " GROUP BY " + request.group;
	
	return isJoin ? SQL : SQL + ";";
}

function makeInsertSQL(request, paramAppend) {
	paramAppend = paramAppend !== undefined ? "_" + paramAppend : "";
	let SQL = "INSERT INTO " + request.table;
	if(request.values) {
		let cols = [];
		let placeholders = [];
		for(col in request.values) {
			cols.push(col);
			placeholders.push("$" + col + paramAppend);
		}
		SQL += " (" + cols.join(",") + ") VALUES (" + placeholders.join(",") + ")";
	} else {
		SQL += " DEFAULT VALUES";
	}
	SQL += ";";
	return SQL;
}

function makeUpdateSQL(request, paramAppend) {
    paramAppend = paramAppend !== undefined ? "_" + paramAppend : "";
	let SQL = "UPDATE " + request.table + " SET ";

    for (col in request.values)
        SQL += col + " = $" + col + paramAppend + ", ";
    SQL = SQL.substring(0, SQL.length - 2) + " "; //Remove trailing comma

    SQL += makeWhereSQL(request);

    return SQL + ";";
}

function makeDeleteSQL(request) {
    let SQL = "DELETE FROM " + request.table;
    SQL += makeWhereSQL(request);
    return SQL + ";";
}

function makeWhereSQL(request) {
    let SQL;
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
            groupedSQL[group].push("(" + request.filter[i].col + (request.filter[i].operator ? " " + request.filter[i].operator + " " : " = ") + "$" + request.filter[i].col + "_f" + i + ")");
            request.filter[i][request.filter[i].col + "_f" + i] = request.filter[i].col;
            delete request.filter[i][request.filter[i].col];
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

function addInsertFields(values, userId) {
    let now = Math.floor(Date.now() / 1000);
    values.createdBy = userId || "0";
    values.created = now;
    values.modifiedBy = userId || "0";;
    values.modified = now;
}

function addUpdateFields(values, userId) {
    values.modifiedBy = userId ? userId : "0";;
    values.modified = Math.floor(Date.now() / 1000);
}

function makeParams(values, append) {
    let ret = {};
    for(let key in values) {
        writeKey = append ? key + "_" + append : key;
        if(values[key] != values) {
            if(values[key] instanceof coop.CoopModel) {
                ret[writeKey] = values[key].getPK();
            } else if(Array.isArray(values[key])) {
                let valArray = [];
                for(let val in values[key]) {
                    valArray.push(values[key][val] instanceof coop.CoopModel ? values[key][val].getPK() : values[key][val]);
                }
                ret[writeKey] = valArray.join(',');
            } else if(typeof values[key] == 'object' && values[key] != null) {
                ret[writeKey] = JSON.stringify(values[key]);
            } else
                ret[writeKey] = values[key] ? values[key] : null;
        }
    }
    return ret;
}

module.exports = {

    test: function (request) {
        return makeSelectSQL(request);
    },

    isSQL: true,

    makeCookieStore: function (session) {
        let connectSQLite3 = require('connect-sqlite3')(session);
        let store = new connectSQLite3({
            table: "Sessions",
            db: 'coop.db',
            dir: "./db"
        });
        return store;
    },

    ensureDBSchema: function () {
        return db.exec(
            `CREATE TABLE IF NOT EXISTS Users (
				userId VARCHAR PRIMARY KEY,
				familyId INTEGER,
				firstName VARCHAR,
				lastName VARCHAR,
				bio VARCHAR,
				email VARCHAR,
				phone VARCHAR,
                phoneCarrier VARCHAR,
				contactPref VARCHAR,
				training VARCHAR,
				created INTEGER,
				modified INTEGER
			);
			CREATE TABLE IF NOT EXISTS Families (
				familyId INTEGER PRIMARY KEY AUTOINCREMENT,
				address VARCHAR,
				household VARCHAR,
				emergencyContacts VARCHAR,
				houseAdults VARCHAR,
				houseChildren VARCHAR,
				housePets VARCHAR,
                comment VARCHAR,
                children VARCHAR,
                balance INTEGER,
				created INTEGER,
				createdBy VARCHAR,
				modified INTEGER,
				modifiedBy VARCHAR
			);
			CREATE TABLE IF NOT EXISTS Requests (
				requestId INTEGER PRIMARY KEY AUTOINCREMENT,
				requestedBy VARCHAR,
                familyId INTEGER,
				startTime INTEGER,
				endTime INTEGER,
				children VARCHAR,
				comment VARCHAR,
				assignedTo VARCHAR,
                fulfillment VARCHAR,
                fulfilled BOOLEAN,
				fbPostId VARCHAR,
				created INTEGER,
				createdBy VARCHAR,
				modified INTEGER,
				modifiedBy VARCHAR
			);
			CREATE TABLE IF NOT EXISTS Offers (
				requestId INTEGER,
				userId VARCHAR,
				comment VARCHAR,
				created INTEGER,
				createdBy VARCHAR,
				modified INTEGER,
				modifiedBy VARCHAR
			);
			CREATE TABLE IF NOT EXISTS Children (
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
				bedRoutine VARCHAR,
				created INTEGER,
				createdBy VARCHAR,
				modified INTEGER,
				modifiedBy VARCHAR
			);`
        );
    },

    /**
     * 
     */
    get: function (request, topRowOnly) {
        return new Promise((resolve, reject) => {
            try {
                if(topRowOnly) {
                    let res = db.prepare(makeSelectSQL(request)).get();
                    for(col in res) {
                        if(typeof res[col] === 'string' && (res[col].charAt(0) == "{" && res[col].charAt(res[col].length - 1) == "}")) {
                            res[col] = JSON.parse(res[col]);
                        }
                    }
                    resolve(res);
                } else {
                    let res = db.prepare(makeSelectSQL(request)).all();
                    for(let i = 0; i < res.length; i++) {
                        for(col in res[i]) {
                            if(typeof res[i][col] === 'string' && (res[i][col].charAt(0) == "{" && res[i][col].charAt(res[i][col].length - 1) == "}")) {
                                res[i][col] = JSON.parse(res[i][col]);
                            }
                        }
                    }
                    resolve(res);
                }
            } catch(err) {
                reject(err);
            }
        });
    },

    batchGet: function (requestArray, topRowOnly) {
        return new Promise((resolve, reject) => {
            let ret = [];
            if(!Array.isArray(requestArray)) {
                requestArray = [requestArray];
            }
            try {
                for(let i = 0; i < requestArray.length; i++) {
                    if(topRowOnly)
                        ret.push(db.prepare(makeSelectSQL(requestArray[i])).get());
                    else
                        ret.push(db.prepare(makeSelectSQL(requestArray[i])).all());
                }
                resolve(ret);
            } catch(err) {
                reject(err);
            }
        });
    },

    //This is potentially dangerous - do not inject user-provided values into raw SQL
    runSQL: function (SQL) {
        return new Promise((resolve, reject) => {
            return resolve(db.prepare(SQL).all());
        });
    },

    insert: function (request) {
        return new Promise((resolve, reject) => {
            if(!request.table || !request.values)
                return reject("Table and values properties are required");

            let SQL = makeInsertSQL(request);
            let params = makeParams(request.values);
            addInsertFields(params, request.userId);

            return resolve(db.prepare(SQL).run(params));
        });
    },

    //batchInsert takes either a single array of objects as its argument or any number of objects.
    //Each object should have two keys: (String)table - the table name - and (Object)values - an object that contains key:value pairs to insert
    batchInsert: function () {
        return new Promise((resolve, reject) => {
            let requests = [];
            let stmnts = [];
            let params = {};
            if(Array.isArray(arguments[0])) {
                requests = arguments[0];
            } else {
                requests = arguments;
            }

            for(let i = 0; i < requests.length; i++) {
                if(!requests[i].table || !requests[i].values)
                    return reject("Table and values properties are required for all requests");

                stmnts.push(makeInsertSQL(requests[i], i));
                let reqParams = makeParams(requests[i].values, i);
                addInsertFields(reqParams, requests[i].userId);
                params = { ...params, ...reqParams };
            }

            return resolve(db.transaction(stmnts).run(params));
        });
    },

    //Update
    //To avoid mistakes, filter must be defined.  Pass in an empty object to update every row in the table.
    update: function (request) {
        return new Promise(function (resolve, reject) {
            if(!request.filter)
                return reject("Invalid request: Filter is not defined. If you want to update all rows, pass an empty object {} as the filter.");
            else if(!request.table || !request.values)
                return reject("Table, values properties are required");
            else if(request.filter.keys.length == 0)
                delete request.filter;

            let SQL = makeUpdateSQL(request);
            let params = makeParams(request);

            addUpdateFields(params, request.userId);

            return resolve(db.prepare(SQL).run(params));
        });
    },

    batchUpdate: function () {
        return new Promise((resolve, reject) => {
            let requests = [];
            let stmnts = [];
            let params = {};
            if(Array.isArray(arguments[0])) {
                requests = arguments[0];
            } else {
                requests = arguments;
            }

            for(let i = 0; i < requests.length; i++) {
                if(!requests[i].filter)
                    return reject("Invalid request: Filter is not defined. If you want to update all rows, pass an empty object {} as the filter.");
                if(!requests[i].table || !requests[i].values)
                    return reject("Table, values properties are required for all requests");

                stmnts.push(makeUpdateSQL(requests[i], i));
                let reqParams = makeParams(requests[i].values, i);
                addUpdateFields(requests[i].values, requests[i].userId);
                params = { ...params, ...reqParams };
            }

            return resolve(db.transaction(stmnts).run(params));
        });
    },

    erase: function (request) {
        return new Promise(async (resolve, reject) => {
            let SQL;

            if(!request.filter)
                return reject("Invalid request: Filter is not defined. If you want to delete all rows, pass an empty object as the filter.");
            else if(!request.table)
                return reject("Table is required");
            else if(request.filter.keys.length == 0)
                delete request.filter;

            SQL = makeDeleteSQL(request);
            try {
                let r = db.prepare(SQL).run();
                resolve(r);
            } catch(err) {
                reject(err);
            }
        });
    }
}