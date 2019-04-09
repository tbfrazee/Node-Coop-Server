//**************
//Functions
//**************

//Many of these are depricated
//Clean up needed

function exchangeBalance(options) {
    return new Promise(async (resolve, reject) => {
        let fromFamily, toFamily, amount;

        if (options.from && options.to && (options.amount || (options.start && options.end))) {
            let familyIds = await getFamiliesforUsers([options.from, options.to]);
            fromFamily = familyIds[options.from];
            toFamily = familyIds[options.to];
            amount = options.amount ? options.amount : (options.end - options.start);
        } else if(options.requestId) {
            try {
                let reqDetails = db.get({
                    table: "Requests",
                    cols: ["requestId", "requestedBy", "assignedTo", "fulfillStartTime", "fulfillEndTime"],
                    filter: [{ requestId: options.requestId }]
                }, true);
                let familyIds = await getFamiliesForUsers([reqDetails.requestedBy, reqDetails.assignedTo]);
                if (reqDetails) {
                    fromFamily = familyIds[reqDetails.requestedBy];
                    toFamily = familyIds[reqDetails.assignedTo];
                    amount = fulfillEndTime - fulfillStartTime;
                }
            } catch (err) {
                return reject(err);
            }
        }

        try {
            db.batchUpdate([
                {
                    table: "Balances",
                    values: { balance: "balance - " + amount },
                    filter: [{ col: "familyId", value: fromFamily }]
                },
                {
                    table: "Balances",
                    values: { balance: "balance + " + amount },
                    filter: [{ col: "familyId", value: toFamily }]
                }
            ]);
        } catch (err) {
            return reject(err);
        }
    });
}

function getFamiliesforUsers(userIds) {
    return new Promise(async (resolve, reject) => {
        if (!Array.isArray(userIds))
            userIds = arguments;
        if (!userIds.length)
            reject("No user IDs provided.");

        try {
            let filters = [];
            for (let i = 0; i < userIds.length; i++) {
                filters.push({ col: "userId", value: userIds[i] });
            }

            let dbRes = db.get({
                table: "Users",
                cols: ["userId", "familyId"],
                filter: filters
            });

            let resJson = {};
            for (let i = 0; i < dbRes.length; i++)
                resJson[dbRes[i].userId] = dbRes[dbRes[i].familyId];
            resolve(resJson);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Sets the status of the passed response (default 200) and sends the passed JSON as a string
 * @param object res        The response object that the data should be returned to
 * @param object resJson    JSON to be stringified and returned.
 */
function sendResponse(res, resJson) {
	if(resJson) {
		if(resJson.success == true) {
			res.status(200).send(JSON.stringify(resJson));
		} else if(resJson.status) {
			res.status(resJson.status).end(JSON.stringify(resJson));
		} else {
			res.status(500).end(JSON.stringify(resJson));
		}
	} else {
		resJson = {
			success: false,
			error: "An unknown error occurred.  Sorry.  Please try again in a few minutes or contact your system administrator."
		};
		res.status(500).end(JSON.stringify(resJson));
	}
}

/**
 * Make a Graph API call to Facebook.
 * Basically the FB.api callback wrapped in a promise.
 * @param string edge	The edge to call
 * @param string prot	(Optional) The protocol (i.e. "GET", "POST") to use for the call
 * @param object opts	(Optional) Options to pass along (such as access_token)
 * @return Promise		A Promise that resolves to the response object from Facebook or rejects with the contents of an error response
 */
function FB_API() {
	let edge = arguments[0];
	let prot;
	let opts;
	
	if(arguments.length == 3) {
		prot = arguments[1];
		opts = arguments[2];
	} else {
		prot = "GET";
		opts = arguments[1];
	}
	
	return new Promise(function(resolve, reject) {
		FB.api(edge, prot, opts, function(res) {
			if(!res || res.error) {
				reject(!res ? 'error occurred' : res.error);
			} else {
				resolve(res);
			}
		});
	});
}

/*
function notifyUser(userId, title, message, url) {
    return new Promise(async (resolve, reject) => {
        try {
            let pref = await db.get({
                table: "Users",
                cols: ["contactPref"],
                filter: [{ col: "userId", value: userId }]
            }, true);
            if (pref) {
                if (pref.email)
                    sendEmail(userId, title, message, url);
                if (pref.text)
                    sendText(userId, title, message, url);
                if (pref.fb)
                    sendFBNotification(userId, title, message, url);
            }
        }
    });
}
*/

/**
 * A simple Promise wrapper for fs.readFile
 * If there's an error, it simply writes to console and quits - does not reject
 * @param string file	A fully-qualified or relative path to the file to be loaded
 */
function readFile(file) {
	return new Promise((resolve, reject) => {
		fs.readFile(file, 'utf8', function(err, data) {
			if(!err){
				return resolve(data);
			} else {
				console.log(err);
			}
		});
	});
}

/**
 * Adds the standard template features to the current page
 * This should be called for all pages except the welcome page and print pages
 * @param object req	The request sent from the client. Template render data will be stored here.
 */
function setStandardTemplate(req) {
	if(!req.renderData) {
        req.renderData = { ...renderData };
	} else {
		req.renderData = {...req.renderData, ...renderData};
	}
	req.renderData.userFirstName = req.session.firstName;
    req.renderData.userHours = req.session.hours;
}

async function getPageContent(req, page, partials) {
    if(!req || !page) {
        return;
    }
    if(partials) {
        if(!Array.isArray(partials)) {
            for(let i = 2; i < arguments.length; i++) {
                partials = [];
                partials.push(arguments[i]);
            }
        }
    } else {
        partials = [];
    }

    let toLoad = [];
    toLoad.push(getPartial.bind(page, req, "page"));
    for(let i = 0; i < partials.length; i++)
        toLoad.push(getPartial.bind(partials[i]), req);

    try {
        return await Promise.all(toLoad);
    } catch(err) {
        let errMsg = "Error loading page content. Please contact your administrator if this error keeps happening.";
        req.error(errMsg);
        throw errMsg;
    }
}

/**
 * Gets a template partial (templated HTML) from a file
 * @param string filename	The name of the file to read
 * @param object req		The request object sent from the client. Template render data will be stored here.
 * @return Promise			A Promise that resolves to an object containing the contents of the file under key "partial". It will also be written to req.renderData. Else an error.
 */
function getPartial(filename, req, type) {
    return new Promise(function (resolve, reject) {
        type = type ? type : "partial";
        let dir;
        if(type == "partial") {
            dir = "partials";
        }
        else if(type == "page") {
            dir = "pages";
        }
		if(filename) {
			if(filename.length - filename.lastIndexOf(".html") - 1 == 5) {
				filename.slice(0, -5);
			}
			fs.readFile('public/html/' + dir + '/' + filename + ".html", 'utf8', function(err, data) {
				if(!err) {
					if(req) {
						if(!req.renderData) {
							req.renderData = {};
						}
                        if(type == "partial") {
                            if(!req.renderData[filename])
                                req.renderData[filename] = {};
                            req.renderData[filename].partial = data;
                        } else if(type == "page")
                            req.renderData.pageContent = data;
					}
                    return resolve(data);
				} else {
					return reject(err);
				}
			});
		} else {
			return reject("No filename provided");
		}
	});
}

function getPage(filename, req) {
    return getPartial(filename, req, "page");
}

/**
 * Compiles .scss files in public/scss and deposits the resulting .css files in public/css
 * Logs errors to console but does not stop execution
 */
function compileSCSS() {
	fs.readdir('public/scss/', (err, files) => {
		for(let i = 0; i < files.length; i++) {
			scss.render({file: 'public/scss/' + files[i]}, (err, result) => {
				if(err) {
					console.log("Failed to render .scss file " + files[i] + ": " + err);
				} else {
					fs.writeFile('public/css/' + files[i].replace(".scss", ".css"), result.css, (err) => {
						if(err) {
							console.log("Failed to compile .scss file " + files[i] + ": " + err);
						}
					});
				}
			});
		}
	});
}

function validateUserIds(ids) {
    return new Promise(async (resolve, reject) => {
        ids = makeArgArray(arguments);
        if(ids.length) {
            let dbReq = {
                table: "Users",
                cols: ["COUNT(userId) AS matchCt"],
                filter: {
                    col: "userId",
                    operator: "IN",
                    value: ids.join(",")
                }
            };
            try {
                let dbRes = await db.get(dbReq, true);
                if(dbRes.matchCt == ids.length) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch(err) {
                reject(err);
            }
        }
    });
}

function getFamiliesForUsers(ids) {
    return new Promise(async (resolve, reject) => {
        ids = makeArgArray(ids);
        if(ids.length) {
            let dbReq = {
                table: "Users",
                cols: ["userId", "familyId"],
                filter: {
                    col: "userId",
                    operator: "IN",
                    value: ids.join(",")
                }
            };
            try {
                let dbRes = await db.get(dbReq);
                let ret = {};
                for(let row in dbRes) {
                    ret[row] = dbRes[row];
                }
                return resolve(ret);
            } catch(err) {
                return reject(err);
            }
        }
    });
}

function makeArgArray() {
    if(arguments.length == 1) {
        if(Array.isArray(arguments[0]))
            return arguments[0];
        else
            return [arguments[0]];
    } else if(arguments.length > 1)
        return arguments;
    else
        return [];
}

/**
 * Gets member IDs, first names, and last names.
 * Passing user IDs as arguments will return information for all requested IDs.
 * Passing no arguments will retrieve information for all users.
 * @param array ids	The user IDs to retrieve information for.
 * @return Promise	A Promise that resolves to an array of rows or rejects with an error string.
 */
function getMemberNames() {
	
	var args;
	
	if(arguments.length == 1) {
		if(arguments[0].constructor === Array) {
			args = arguments[0];
		} else {
			args = arguments;
		}
	} else {
		args = arguments;
	}
	
	return new Promise(async (resolve, reject) => {
		let resJson = {};
		
		let filter;
		if(args.length) {
			filter = {col: "userId", operator: "IN", value: "(" + args.join(",") + ")"};
		}
		try{
            let rows = await db.get({
                table: "Users",
                cols: ["userId", "firstName", "lastName"],
                filter: filter
            });
			return resolve(rows);
		} catch(err) {
			return reject("Unable to retrieve necessary data from the server. Please try again later, or contact your server admin if the problem persists.");
		}
	});
}

/**
 * Gets all familyIds alongside the names of all users in each family
 * @return Promise	A Promise that resolves into an array of rows or rejects with an error string
 */
function getFamilyNames() {
	return new Promise(async(resolve, reject) => {
		let retVal = {};
		
		let request = {
			table: "Users",
			cols: ["group_concat(firstName || ' ' || lastName, ', ') AS names", "familyId"],
			group: "familyId"
		}

		try {
			let rows = await db.get(request);
			return resolve(rows);
		} catch(err) {
			reject(err);
		}
	});
};
/**
 * Gets the "childId" and "name" fields for all children for a given familyId
 * @param integer familyId  The familyId to look up children for
 * @return Promise          A Promise that resolves into an array of rows or rejects with an error string
 */
function getChildNamesForFamily(familyId) {
    return new Promise(async (resolve, reject) => {
        if(!familyId)
            return reject("Family ID is required.");
		try {
			rows = await db.get({table: "Children", cols: ["childId", "name"], filter:{col: "familyId", value: familyId}});
			return resolve(rows);
		} catch(err) {
			console.log("Unable to get children for family " + familyId + ". Error: " + dbErr);
			return reject(dbErr);
		}
	});
}

/**
 * Gets information for all children assocaited with a given familyId
 * @param integer familyId	The familyId to look up children for.
 * @return Promise			A Promise that resolves into an array of rows or rejects with an error string
 */
function getChildrenForFamily(familyId) {
    return new Promise(async (resolve, reject) => {
        if(!familyId) {
            return reject("Family ID is required.");
        }
		try {
			rows = await db.get({table: "Children", filter:{col: "familyId", value: familyId}});
			return resolve(rows);
		} catch(err) {
			console.log("Unable to get children for family " + familyId + ". Error: " + dbErr);
			return reject(dbErr);
		}
	});
}

/**
 * Gets all information about a single request
 * @param integer familyId	The familyId associated with the request
 * @param integer requestId	The requestId to look up
 * @return Promise			A promise that resolves into a row object or rejects with an error string
 */
function getRequestDetail(requestId) {
    return new Promise(async function (resolve, reject) {
        if(!requestId) {
            return reject("requestId is required.");
        }
		
		/*let requestedUserJoin = {
			table: "Users",
			cols: ["userId", "firstName", "lastName"],
			alias: "rUser",
			joinType: "LEFT OUTER",
			on: {left: "requestedBy", right: "userId"}
		}
		
		let assignedUserJoin = {
            table: "Users",
            cols: ["group_concat(userId) AS ids", "group_concat(firstName) AS firstNames", "group_concat(lastName) AS lastNames"]
			cols: ["userId", "firstName", "lastName"],
			alias: "aUser",
			joinType: "LEFT OUTER",
            on: {
                left: "assignedTo",
                right: {
                    table: "Users",
                    col
                }
            }
		}*/
		
		try {
			let req = await db.get({
				table: "Requests",
				filter:{col: "requestId", value: requestId}//,
				//join: [requestedUserJoin, assignedUserJoin]
			}, true);
			if(req) {
				if(req.startTime)
					req.startTime = new Date(req.startTime * 1000).toISOString().slice(0, -1);
				if(req.endTime)
                    req.endTime = new Date(req.endTime * 1000).toISOString().slice(0, -1);

                let users = await db.get({
                    table: "Users",
                    cols: ["userId", "firstName", "lastName"],
                    filter: [{
                        col: "userId",
                        value: req.requestedBy,
                        group: 1
                    },{
                        col: "userId",
                        operator: "IN",
                        value: req.assignedTo,
                        group: 1
                    }],
                    filterGroups: {
                        1: "OR"
                    }
                });

                req.assignedToTags = [];
                for(let user in users) {
                    if(user.userId == req.requestedBy)
                        req.requestedByName = user.firstName + " " + user.lastName;
                    else
                        req.assignedToTags.push(user.firstName + " " + user.lastName);
                }				
				return resolve(req);
			} else {
				return resolve({});
			}
		} catch(dbErr) {
			console.error("Unable to get request details. " + dbErr);
			return reject(dbErr);
		}
	});
}

function getRequestFilters(req) {
    let filters = [];
    let statusFilter = ["open", "assigned", "fulfilled", "unfulfilled"].includes(req.query.status) ? req.query.status : "open";
    switch(statusFilter) {
        case "open":
            filters.push(
                {
                    col: "assignedTo",
                    operator: "IS",
                    value: "NULL",
                    group: 1
                },
                {
                    col: "fulfilled",
                    operator: "IS",
                    value: "NULL",
                    group: 2
                },
                {
                    col: "fulfilled",
                    value: false,
                    group: 2
                }
            );
            filterGroups = {
                2: "OR"
            };
            break;
        case "assigned":
            filters.push(
                {
                    col: "assignedTo",
                    operator: "IS NOT",
                    value: "NULL",
                    group: 1
                },
                {
                    col: "fulfilled",
                    operator: "IS",
                    value: "NULL",
                    group: 2
                },
                {
                    col: "fulfilled",
                    value: false,
                    group: 2
                },
                {
                    col: "requestEnd",
                    operator: ">",
                    value: now,
                    group: 3
                }
            );
            filterGroups = {
                2: "OR"
            }
            break;
        case "completed":
            filters.push(
                {
                    col: "assignedTo",
                    operator: "IS NOT",
                    value: "NULL"
                },
                {
                    col: "fulfilled",
                    value: true
                },
                {
                    col: "requestEnd",
                    operator: ">=",
                    value: now
                }
            );
            break;
        case "unfulfilled":
            filters.push(
                {
                    col: "assignedTo",
                    operator: "IS",
                    value: "NULL",
                    group: 1
                },
                {
                    col: "fulfilled",
                    value: false,
                    group: 2
                },
                {
                    col: "fulfilled",
                    operator: "IS NOT",
                    value: "NULL",
                    group: 2
                },
                {
                    col: "requestEnd",
                    operator: ">=",
                    value: now
                }
            );
            filterGroups = {
                2: "OR"
            };
            break;
        default:
            res.renderData.error = "Invalid filter value.";
            return next();
    }

    if(req.query && req.query.role == "assigned") {
        filters.push({
            col: "assignedTo",
            operator: "IN",
            value: req.session.userId
        });
    } else {
        filters.push({
            col: "requestedBy",
            value: req.session.userId
        });
    }

    return filters;
}

/**
 * Gets all requests that meets the passed parameters
 * Returns a subset of request data for the requestList API call
 * @param integer primaryKey	The value to lookup. Typically the current user's ID
 * @param object options		An object of options such as filters
 * @return Promise				A Promise that resolves into an array of row objects or rejects with error string
 */
function getRequests(options) {
	return new Promise(async function(resolve, reject) {

        let addPKFilter, pkCol, pkOperator, pkValue, pkOn;
		if(!options) options = {};
        options.filter = options.filter ? options.filter : "open";

        if (options.pk) {
            addPKFilter = true;
            pkCol = ["requestedBy", "assignedTo"].includes(options.pk.col) ? options.pk.col : "requestedBy";
            pkOperator = "=";
            pkValue = options.pk.value ? options.pk.value : req.session.userId;
            pkOn = options.pk.on ? options.pk.on : "userId";
        }

		let now = Math.floor(Date.now() / 1000);
		
		let filters = [];
		filterGroups = {};
		switch(options.filter) {
			case "open":
                filters.push(
                    {
                        col: "assignedTo",
                        operator: "IS",
                        value: "NULL",
                        group: 1
                    },
                    {
                        col: "fulfilled",
                        operator: "IS",
                        value: "NULL",
                        group: 2
                    },
                    {
                        col: "fulfilled",
                        value: false,
                        group: 2
                    }
                );
				filterGroups = {
					2: "OR"
				};
				break;
			case "assigned":
				filters.push(
					{
						col: "assignedTo",
						operator: "IS NOT",
						value: "NULL",
						group: 1
					},
					{
						col: "fulfilled",
						operator: "IS",
						value: "NULL",
						group: 2
					},
					{
						col: "fulfilled",
						value: false,
						group: 2
					},
					{
						col: "requestEnd",
						operator: ">",
						value: now,
						group: 3
					}
                );
				filterGroups = {
					2: "OR"
				}
				break;
			case "completed":
				filters.push(
					{
						col: "assignedTo",
						operator: "IS NOT",
						value: "NULL"
					},
					{
						col: "fulfilled",
						value: true
					},
					{
						col: "requestEnd",
						operator: ">=",
						value: now
					}
				);
				break;
            case "unfulfilled":
                filters.push(
                    {
                        col: "assignedTo",
                        operator: "IS",
                        value: "NULL",
                        group: 1
                    },
                    {
                        col: "fulfilled",
                        value: false,
                        group: 2
                    },
                    {
                        col: "fulfilled",
                        operator: "IS NOT",
                        value: "NULL",
                        group: 2
                    },
                    {
                        col: "requestEnd",
                        operator: ">=",
                        value: now
                    }
                );
                filterGroups = {
                    2: "OR"
                };
                break;
            default:
                return reject("Invalid filter value");
        }

        if (addPKFilter) {
            if (pkOn == "familyId") {
                if (pkCol == "assignedTo") {
                    filters.push({
                        col: "aUser_familyId",
                        operator: pkOperator,
                        value: pkValue
                    });
                } else {
                    filters.push({
                        col: "rUser_familyId",
                        operator: pkOperator,
                        value: pkValue
                    });
                }
            } else {
                filters.push({
                    col: pkCol,
                    operator: pkOperator,
                    value: pkValue
                });
            }
        }
		
		let requestedUserJoin = {
			table: "Users",
			cols: ["userId", "firstName", "lastName", "familyId"],
			alias: "rUser",
			joinType: "LEFT OUTER",
			on: {left: "requestedBy", right: "userId"}
		}
		
		let assignedUserJoin = {
			table: "Users",
			cols: ["userId", "firstName", "lastName", "familyId"],
			alias: "aUser",
			joinType: "LEFT OUTER",
			on: {left: "assignedTo", right: "userId"}
        }
		
		try {
			let rows = await db.get({
				table: "Requests",
				cols: ["requestId", "startTime", "endTime", "rUser_id", "rUser_firstName", "rUser_lastName", "aUser_id", "aUser_firstName", "aUser_lastName", "fulfilled"],
				filter: filters,
				filterGroups: filterGroups,
				join: [requestedUserJoin, assignedUserJoin]
			});
			
            if (rows.length > 0) {
                for (i = 0; i < rows.length; i++) {
                    if (rows[i].rUser_id)
                        rows[i].requestedBy = rows[i].rUser_firstName + " " + rows[i].rUser_lastName;
                    if (rows[i].aUser_id)
                        rows[i].assignedTo = rows[i].aUser_firstName + " " + rows[i].aUser_lastName;

                    ['rUser_id', 'rUser_firstName', 'rUser_lastName', 'aUser_id', 'aUser_firstName', 'aUser_lastName'].forEach(e => delete rows[i][e]);

                    if (rows[i].requestEnd > now) {
                        if ((rows[i].assignedTo == undefined || rows[i].assignedTo == "")) {
                            rows[i].status = "Open";
                        } else {
                            rows[i].status = "Assigned";
                        }
                    } else {
                        if ((rows[i].assignedTo == undefined || rows[i].assignedTo == "")) {
                            rows[i].status = "Unfulfilled";
                        } else {
                            rows[i].status = "Completed";
                        }
                    }
                }
                return resolve(rows);
            } else {
                return resolve({});
            }
		} catch(err) {
			console.error("Unable to get requests. Error: " + err);
			return reject(dbErr.message);
		}
	});
}