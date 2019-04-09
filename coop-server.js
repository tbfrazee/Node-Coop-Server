/**
 * Babysitting Coop Server for NodeJS
 * Copyright (c) 2018 Tim Frazee
 */

'use strict';

//Module dependencies
const express = require('express');
const app = express();
const https = require('https');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const helmet = require('helmet');
const FB = require('fb');
const whiskers = require('whiskers');
const scss = require('node-sass');
const util = require('./coop/functions.js');

//Load configuration file
const config = require('./config/config.js');
const port = config.port;
const sslOptions = config.useSSL ? {
    key: fs.readFileSync(config.sslKeyFile),
    cert: fs.readFileSync(config.sslCertFile),
    passphrase: config.sslPasswordStr ? config.sslPasswordStr : (config.sslPasswordFile ? fs.readFileSync(config.sslPasswordFile) : undefined)
} : undefined;

//Template engine
app.engine('.html', whiskers.__express);
app.set('views', "public/html");

//Use middleware
app.use(helmet());

app.use(bodyParser.json());	//BodyParser for parsing application/json request bodies
app.use(bodyParser.urlencoded({ extended: true }));	//BodyParser for parsing application/x-www-form-urlencoded request bodies

app.use(express.static('public'));

//Database setup
const db = require(config.dbScript);
app.use(session({
	store: db.makeCookieStore(session),
	resave: false,
	saveUninitialized: false,
	secret: config.cookie.secret
}));
db.ensureDBSchema();

//Include coop scripts
const coop = require('./coop/models');
const util = require('./coop/util')
coop.init(db);

//Compile SCSS
util.compileSCSS();

//Cache static default renderData
var renderData = {
	siteShortName: config.serverShortName,
	sitePrettyName: config.serverPrettyName,
    fbGroupName: config.fbGroupName,
    redirectOnError: true //By default, server-side errors that render a view will redirect back to mainmenu
};

Promise.all([
    util.getPartial('htmlhead'),
    util.getPartial('js'),
    util.getPartial('nav'),
    util.getPartial('errorModal')
]).then(
    function (result) {
        renderData.htmlhead = result[0];
        renderData.js = result[1];
        renderData.nav = result[2];
        renderData.errorModal = result[3];
    }
);

//*******************
//ROUTING
//*******************
//No login required for these following routes
//*******************

//Welcome (login) page
app.get("/", async (req, res) => {
    req.renderData = { ...renderData };
    Promise.all([
        util.getPartial('newuserform', req),
        util.getPartial('userform', req),
        util.getPartial('familyform', req),
        util.getPartial('familyselect', req)
    ]).then(
        function () {
            req.renderData.userform.hideFamilySelect = true;
            res.render('welcome.html', req.renderData);
        },
        function (err) { req.renderData.error = err; res.render('welcome.html', req.renderData); }
    );
});

//Login and registration pipeline
app.post('/login', async (req, res) => {
	let resJson = {};
    let unauthJson = {
        status: 401,
		success: false,
		error: "Unauthorized",
		redirect: "/welcome"
	};
	
	if(!req.body.user || !req.body.token) {
		res.status(401).end(JSON.stringify(unauthJson));
	}
	
	try {
        let fbRes = await util.FB_API("/" + req.body.user + "/groups", {"access_token": req.body.token});
		let isInGroup = false;
		for(let grp in fbRes.data) {
			if(fbRes.data[grp].id == config.fbGroupId) {
				//Authorized!
				//Store FB ID and token for future use
				isInGroup = true;
				req.session.userId = req.body.user;
				req.session.token = req.body.token;
			}
		}
		if(!isInGroup)
			return util.sendResponse(res, unauthJson);
	} catch(fbErr) {
		console.log(fbErr);
		resJson.success = false;
		resJson.error = "Unable to connect to Facebook to validate your group membership. Please try again."
		resJson.status = 500;
		return util.sendResponse(res, resJson);
	}
	
	try {
		//See if user is already registered on the site
		let userData = await db.get({
			table: "Users",
			cols: ['userId', 'firstName', 'lastName', 'familyId'],
			filter: [{col: "userId", value: req.body.user}]
		}, true);
		if(userData && userData.userId == req.body.user) {
			//User is registered; create session and let them through
			//Create a session
			req.session.auth = true;
			req.session.firstName = userData.firstName;
			req.session.lastName = userData.lastName;
			req.session.familyId = userData.familyId;
			resJson.success = true;
			resJson.cmd = "redirect";
			resJson.silent = true;
			resJson.redirect = "mainmenu";
			return util.sendResponse(res, resJson);
		} else {
			//User is not registered
			if(req.body.userReg) {
				//If a userReg is provided, register user and log them in
				//First things first, get the user's basic info from Facebook, then continue on to registration
				try{
					let fbRes = await util.FB_API(req.body.user, {access_token: req.body.token, fields: "first_name, last_name"});
					let userReg = req.body.userReg;
					let userParams;
					let familyParams;
					let familyId;
					
					//If userReg.familyId == "NewFamily", we must also have a familyReg object
					if(req.body.userReg.familyId == "NewFamily") {
						if(req.body.familyReg) {
							let familyReg = req.body.familyReg;
							familyParams = {
								"address": {
									"1": familyReg.address1,
									"2": familyReg.address2,
									"city": familyReg.addressCity,
									"state": familyReg.addressState,
									"zip": familyReg.addressZip,
									"type": familyReg.addressType == "Other" ? familyReg.addressTypeOtherExp : familyReg.addressType
								},
								"household": {
									"smoke": familyReg.householdSmoke == "Yes" ? familyReg.householdSmokeExp : false,
									"drug": familyReg.householdDrug == "Yes" ? familyReg.householdDrugExp : false,
									"vaccine": familyReg.householdVaccination == "Yes" ? familyReg.householdVaccinationExp : false,
									"gun": familyReg.householdGun == "Yes" ? familyReg.householdGunExp : false,
									"lockup": familyReg.householdLockup
								},
								"emergencyContacts": familyReg.emergencyContacts,
								"houseAdults": familyReg.householdAdults,
								"houseChildren": familyReg.householdChildren,
                                "housePets": familyReg.householdPets,
                                "comment": familyReg.familyComment,
                                "balance": 300
							};
						} else {
							resJson.success = false;
							resJson.error = "Family registration data is missing or corrupt. Please try again.";
							resJson.status = 500;
							return util.sendResponse(res, resJson);
						}
					} else {
						familyId = req.body.userReg.familyId;
					}
					
					userParams = {
						"userId": req.body.user,
						"familyId": familyId,
						"firstName": fbRes.first_name,
						"lastName": fbRes.last_name,
                        "bio": userReg.bio,
                        "email": userReg.email,
                        "phone": userReg.phone,
                        "phoneCarrier": userReg.phoneCarrierOther ? userReg.phoneCarrierOther : util.phoneCarriers[userReg.phoneCarrier],
						"contactPref": {
							"email": userReg.contactEmail == "Yes" ? true : false,
							"text": userReg.contactText == "Yes" ? true : false,
							"FB": userReg.contactFB == "Yes" ? true : false
						},
						"training": {
							"firstAid": userReg.firstAid == "Yes" ? true : false,
							"cpr": userReg.cpr == "Yes" ? true : false,
							"other": userReg.training == "Yes" ? userReg.trainingExp : false
						}
                    };

                    //If new family, insert family first to get a familyId, then user
                    if(familyParams) {
                        let family = await new coop.Family().init(familyParams).save();
                        userParams.familyId = family.familyId;
                    }
                    let user = await new coop.User().init(userParams).save();

					//User is registered; create session and let them through
					req.session.auth = true;
					req.session.firstName = userParams.firstName;
					req.session.lastName = userParams.lastName;
					req.session.familyId = userParams.familyId;
					resJson.success = true;
					resJson.cmd = "redirect";
					resJson.silent = true;
					resJson.redirect = "mainmenu";
					return util.sendResponse(res, resJson);
					
				} catch(err) {
					resJson.success = false;
					resJson.error = err;
					util.sendResponse(res, resJson);
				}
			} else {
				//If no userReg is provided, go back and ask for one
				//First, get a list of all current users and families to populate the "Join Family" select
				try {
					let rows = await db.get({table: "Users", cols: ["firstName", "lastName", "familyId"]});
					let resData = [];
					for(let i = 0; i < rows.length; i++) {
						let isFound;
						for(let j = 0; j < resData.length; j++)
						{
							if(rows[i].familyId == resData[j].familyId) {
								isFound = true;
								resData[j].names.push(rows[i].firstName + " " + rows[i].lastName);
								break;
							}
						}
						if(!isFound) {
							resData.push({
								familyId: rows[i].familyId,
								names: [rows[i].firstName + " " + rows[i].lastName]
							});
						}
					}
					resJson.families = resData;
					resJson.success = true;
					resJson.cmd = "NewUser";
					return util.sendResponse(res, resJson); //Return to user to get user/family info
				} catch(err) {
					resJson.success = false;
					resJson.error = "Error getting family list for registration.";
					return util.sendResponse(res, resJson);
				}
			}
		}
	} catch(err) {
		resJson.success = false;
		resJson.error = err;
		return util.sendResponse(res, resJson);
	}
	
    res.status(500).end(JSON.stringify({
            success: false,
            error: 'An unknown error occurred. Sorry. Please try again in a few minutes or contact your system administrator.'
        })
    );
});

app.get("/toc", (req, res, next) => {
    if(req.session.auth) {
        next();
    } else {
        res.render("toc.html", )
    }
});

//*******************
//Login required for all following routes
//*******************

app.all("*", (req, res, next) => {
	if(req.session.auth) {
		next();
	} else {
		res.status(401).redirect('/');
	}
});

////Static routes
app.get("*", (req, res, next) => {
	//Add header html to req.renderData - this allows all page templates to access the header partial.
	//Further additions to the template data object should be merged with req.renderData so it persists down the pipe.
	try {
		util.setStandardTemplate(req);
	} catch(err) {
		console.log(err);
	}
	
	next();
});

app.get('/mainmenu', async (req, res, next) => {
    try {
        await util.getPageContent(req, 'mainmenu');
    } catch(err) {
        return next();
    }
    req.renderData.css = "mainmenu";
    req.renderData.js.script = "mainmenu";

    let curTime = Date.now() / 1000;
    let rdKeys = ["openReqs", "nextAssigned", "nextRequest", "totalHours"];
    let queries = [
        {
            table: "Requests",
            cols: ["COUNT(requestId) AS openReqs"],
            filter: [{ col: "assignedTo", operator: "IS", value: "NULL" }, {col: "endTime", operator: ">", value: curTime}]
        },
        {
            table: "Requests",
            cols: ["requestId", "assignedTo", "startTime", "endTime", "children"],
            filter: [{col: "assignedTo", value: req.session.userId}]
        },
        {
            table: "Requests",
            cols: ["requestId", "startTime", "endTime", "children"],
            filter: [{col: "familyId", value: req.session.familyId}]
        },
        {
            table: "Requests",
            cols: ["SUM((endTime - startTime) / 60) AS totalHours"],
            filter: [{ col: "assignedTo", operator: "IS NOT", value: "NULL" }, { col: "endTime", operator: "<", value: curTime }]
        }
    ];

    try {
        let dbRes = await db.batchGet(queries, true);

        for (let i = 0; i < dbRes.length; i++) {
            if (dbRes[i]) {
                for (key in dbRes[i])
                    req.renderData[rdKeys[i]][key] = dbRes[i][key];
            }
        }
    } catch (err) {
        req.renderData.error = err;
    }

    next();
});

app.get('/requestlist', async function (req, res, next) {
    try {
        await util.getPageContent(req, 'requestlist');
        req.renderData.css = "requestlist";
        req.renderData.js.script = "requestlist";
    } catch(err) {
        return next();
    }

    let filters = util.getRequestFilters(req);

    try {
        let requests = await coop.Request.batchGetByFilter(filters)
        
        req.renderData.requests = requests;
        if (req.query.status) {
            req.renderData.status = req.query.status;
        }
    } catch (err) {
        req.renderData.error = err;
    }
    next();
});

/**
 * New request
 * requestdetail.html with blank, active form
 */
app.get('/newrequest', async function (req, res, next) {
    try {
        util.getPageContent(req, 'requestdetail');
        req.renderData.useFB = true;
        req.renderData.useTagger = true;
        req.renderData.css = "requestdetail";
        req.renderData.js.script = "requestdetail";
    } catch(err) {
        return next();
    }

	req.renderData.requestDetail = {
		requestedBy: req.session.userId,
		requestedByName: req.session.firstName + " " + req.session.lastName
	};
	
    try {
        req.renderData.users = coop.User.batchGetData(await coop.User.batchGetAll(["userId", "firstName", "lastName"]));
        req.renderData.children = coop.Child.batchGetData(await coop.Child.batchGetByFamily(req.session.familyId, ["childId", "firstName"]));
        req.renderData.childCount = req.renderData.children.length ? req.renderData.children.length : 1;
	} catch(err) {
		req.renderData.error = err;
    }
    return next();
});

/**
 * View existing request
 * requestdetail.html with form filled in
 * Typically readonly by default, but can be made editable by the requesting user (or admin) if not archived
 */
app.get('/requestdetail', async (req, res, next) => {
    try {
        util.getPageContent(req, 'requestdetail');
        req.renderData.useFB = true;
        req.renderData.useTagger = true;
        req.renderData.css = "requestdetail";
        req.renderData.js.script = "requestdetail";
        req.renderData.isReadOnly = true;
    } catch(err) {
        return next();
    }

	if(!req.query.reqId) {
		req.renderData.error = "Request ID is required.";
		return next();
    }

    try {
        let request = await new coop.Request().load(req.query.reqId);
        req.renderData.reqDetail = request.getData();
        let children = await coop.Child.getBatchByFilter({ col: "familyId", value: req.session.familyId }, ["childId", "firstName"]);
        req.renderData.children = children;
        req.renderData.childCount = req.renderData.children.length;

        if(req.session.isAdmin || req.session.userId == request.requestedBy) {
            let start = new Date(request.startTime * 1000).getTime();
            if(start > Date.now()) {
                req.renderData.reqDetail.isEditable = true;
            } else {
                req.renderData.reqDetail.isFulfillable = true;
            }
        } else if(request.assignedTo.contains(req.session.userId)) {
            let end = new Date(request.endTime * 1000).getTime();
            if(end < Date.now()) {
                req.renderData.reqDetail.isFulfillable = true;
            }
        }
	} catch(err) {
		req.renderData.error = err;
    }

    next();
});

/**
 * New child profile
 * childdetail.html with blank, active form
 */
app.get('/newchild', async (req, res, next) => {
    try {
        await util.getPageContent(req, 'childdetail', 'childform');
        req.renderData.css = "childdetail";
        req.renderData.js.script = "childdetail";
    } catch(err) {}

    next();
});

/**
 * View existing child profile
 * childdetail.html with form filled
 * Typically readonly by default, but can be made editable by a family member (or admin)
 * @param req.body.childId The childId to look up
 */
app.get('/childdetail', async (req, res) => {
    try {
        await util.getPageContent(req, 'childdetail', 'childform');
        req.renderData.css = "childdetail";
        req.renderData.js.script = "childdetail";
    } catch(err) {
        return next();
    }

    let childId = req.query.childId;
    if(childId) {
        try {
            let child = await new Child().load(childId);
            if(child.isReady())
                req.renderData.childData = child;
            else
                req.renderData.error = "No data found for this child.";
        } catch (err) {
            req.renderData.error("Error loading child data. " + err);
        }
    } else {
        req.renderData.error = "Invalid or missing child ID";
    }

	try {
		await util.getPartial('childform', req);
	} catch(err) {
		req.renderData.error = {error: "Error loading page. Please try again or contact your system administrator."};
    }

    req.renderData.isEditable = childData.familyId === req.session.familyId;
    req.renderData.isReadOnly = (req.renderData.isEditable && req.body.isEdit) ? false : true;
	res.render('childdetail.html', req.renderData);
});

//Render the page
app.get("*", (req, res) => {
    res.render('layout.html', req.renderData);
});

////APIs
//Async get from database
app.post('/util.getRequests', async (req, res) => {
    try {
        let filters = util.getRequestFilters(req);
        let data = coop.Request.batchGetData(await coop.Request.batchGetByFilter(filters));
        res.end(JSON.stringify({ success: true, rows: data }));
	} catch(err) {
		res.end(JSON.stringify({success: false, error: err}));
	}
});

app.post('/getMembers', async (req, res) => {
    try {
        let data = coop.User.batchGetData(await coop.User.batchGetAll(["userId", "firstName", "lastName"]));
		res.end(JSON.stringify(data));
	} catch(err) {
		res.end(JSON.stringify({success: false, error: err}));
	}
});

app.post('/getFamilies', async (req, res) => {
	try {
		let data = await getFamilies();
		res.end(JSON.stringify(data));
	} catch(err) {
		res.end(JSON.stringify({success: false, error: err}));
	}
});

//Form submissions
app.post('/submitRequest', async (req, res) => {
	let autoPost = req.body.autoFBPostCheck ? true : false;
	let requiredFields = ["startTime", "endTime", "children"];
	
	//Required Fields
	for(let field in requiredFields) {
		if(!req.body[requiredFields[field]]) {
			return util.sendResponse(res, {success: false, error: "Validation error: " + requiredFields[field] + " is required, but it is missing."});
		}
	}	

    //Validate dates are dates
	try {
		let dateStart = new Date(req.body.StartTime);
		let dateEnd = new Date(req.body.EndTime);
		if(dateEnd <= dateStart) {
			return util.sendResponse(res, {success: false, error: "End time must be later than start time"});
        }

        let i = 0;
        while(req.body["assignedTo" + i]) {
            if(req.body["fulfillStartTime" + i] && req.body["fulfillEndTime" + i]) {
                let fulfillStart = new Date(req.body["fulfillStartTime" + i]);
                let fulfillEnd = new Date(req.body["fulfillEndTime" + i]);
                if(fulfillEnd <= fulfillStart) {
                    return util.sendResponse(res, { success: false, error: "Fulfillment end time must be later than start time" });
                }
            }
            i++;
        }
	} catch(err) {
		return util.sendResponse(res, {success: false, error: "Date validation error"});
	}

    let data = {};

    //Requested By - Allow only admin to submit requests for anyone but themselves
    if(req.session.isAdmin && req.body.requestedBy != req.session.userId) {
        try {
            let requestingUser = await new coop.User().load(req.body.requestedBy);
            if(requestingUser.hasData) {
                data.requestedBy = requestingUser.userId;
                data.familyId = requestingUser.familyId;
            } else
                return util.sendResponse(res, { success: false, error: "Invalid requester user ID" });
        } catch(err) {
            return util.sendResponse(res, { success: false, error: "Error validating requesting user: " + err });
        }
    } else {
        data.requestedBy = req.session.userId;
        data.familyId = req.session.familyId;
    }
    
    //Input basic request values
    data.requestStart = Date(req.body.StartTime).getTime() / 1000;
    data.requestEnd = Date(req.body.EndTime).getTime() / 1000;
    data.children = req.body.children;
    data.comment = req.body.comment ? req.body.comment : "";

    //Fulfillment
	if(req.body.assignedTo && req.body.fulfillStartTime && req.body.fulfillEndTime) {
        try {
            data.fulfillment = [];
            let assignedTo = [];
            i = 0;
            while(req.body["fulfillSelect" + i]) {
                assignedTo.push(req.body["fulfillSelect" + i]);
                i++;
            }
            data.assignedTo = assignedTo.join(",");
            for(u in assignedTo) {
                data.fulfillment.push({ userId: assignedTo[u], start: Date(req.body.fulfilledStartTime).getTime() / 1000, end: Date(req.body.fulfilledEndTime).getTime() / 1000 });
            }
        } catch (err) {
            return util.sendResponse(res, { success: false, error: "Fulfillment data validation error" });
        }
    } else if(req.body.assignedTo)
        data.assignedTo = req.body.assignedTo;
	
    try {
        let request = await new coop.Request().init(data).save();
		if(autoPost) {
			//Create request string - request start and end times into human-readable English
			let startTime = (dateStart.getHours() > 12 ? (dateStart.getHours() % 12 + ":" + (dateStart.getMinutes() < 10 ? "0" + dateStart.getMinutes() : dateStart.getMinutes()) + " PM") : dateStart.getHours() + ":" + (dateStart.getMinutes() < 10 ? "0" + dateStart.getMinutes() : dateStart.getMinutes()) + " AM");
			let endTime = (dateEnd.getHours() > 12 ? (dateEnd.getHours() % 12 + ":" + (dateEnd.getMinutes() < 10 ? "0" + dateEnd.getMinutes() : dateEnd.getMinutes()) + " PM") : dateEnd.getHours() + ":" + (dateEnd.getMinutes() < 10 ? "0" + dateEnd.getMinutes() : dateEnd.getMinutes()) + " AM");
			let strTime = "";
			
			if(dateStart.getDate() != dateEnd.getDate() || dateStart.getMonth() != dateEnd.getMonth()) {
				if(dateStart.getFullYear() < dateEnd.getFullYear()) {
					strTime = utils.days[dateStart.getDay()] + ", " + utils.months[dateStart.getMonth()] + " " + dateStart.getDate() + ", " + dateStart.getFullYear() + " at " + startTime + " to " + utils.days[dateEnd.getDay()] + ", " + utils.months[dateEnd.getMonth()] + " " + dateEnd.getDate() + ", " + dateEnd.getFullYear() + " at " + endTime;
				} else {
					strTime = utils.days[dateStart.getDay()] + ", " + utils.months[dateStart.getMonth()] + " " + dateStart.getDate() + " at " + startTime + " to " + utils.days[dateEnd.getDay()] + ", " + utils.months[dateEnd.getMonth()] + " " + dateEnd.getDate() + " at " + endTime;
				}
			} else {
				strTime = utils.days[dateStart.getDay()] + ", " + utils.months[dateStart.getMonth()] + " " + dateStart.getDate() + " from " + startTime + " to " + endTime;
			}
			
			let autoPostText = "REQUEST: " + strTime + "\r\n\r\n" + req.body.comment;
			
			try {
				let fbRes = await util.FB_API("/" + config.fbGroupId + "/feed", "POST", {
					access_token: req.session.token,
					message: autoPostText,
					link: "www.google.com"
				});
				return res.end(JSON.stringify({success: true, requestId: reqId, autoPost: true, autoPostSuccess: true}));
			} catch(err) {
				return res.end(JSON.stringify({success: true, requestId: reqId, autoPost: true, autoPostSuccess: false}));
			}
			
		} else {
			res.end(JSON.stringify({success: true, requestId: reqId}));
		}
	} catch(err) {
		console.log("Error putting request. " + err);
		res.end(JSON.stringify({success: false, error: 'Error submitting request. Please try again.'}));
	};
});

app.post("/submitChildForm", async (req, res) => {
	let resJson = {};
	let data = {};

	let requiredFields = ["name", "birthdate", "docName", "docAddress", "docPhone"];
	let listFields = ["medicalConditions", "medicine", "foodAllergies", "medicineAllergies", "otherAllergies"];
    for (field in req.body) {
        //Check that all required fields have values
		if(!(requiredFields.includes(field) && req.body[field])) {
			resJson = {success: false, error: "Field " + field + " is required."};
			return util.sendResponse(res, resJson);
        }
        //group variable-length lists into arrays of objects
		for(let list in listFields) {
			if(field.includes(list)) {
				let regex = new RegExp(list + "(\D)+(\d+)");
				let match = regex.exec(field, "gi");
				let fName = match[1].toLowerCase();
				let index = parseInt(match[2]);
				if(fName && index) {
					if(!data[listFields[list]])
						data[listFields[list]] = [];
                    if(!data[listFields[list]][index])
                        data[listFields[list]][index] = {};
                    data[listFields[list]][index][fName] = req.body[field];
				}
			}
		}
	}
	
	data.familyId = req.session.familyId;
	data.created = Date.now().getTime() / 1000;
	data.createdBy = req.session.userId;
	data.modified = Date.now().getTime() / 1000;
	data.modifiedBy = req.session.userId;
	
	data.name = req.body.name;
	data.gender = req.body.gender ? req.body.gender : "";
	data.birthdate = Date(req.body.birthdate).getTime() / 1000;
	data.medicalComment = req.body.medicalComment ? req.body.medicalComment : "";
	data.behavior = req.body.behavior ? req.body.behavior : "";
	data.mealtime = req.body.mealtime ? req.body.mealtime : "";
	data.bedtime = req.body.bedtime ? req.body.bedtime : "";
	
	for(let list in listFields) {
		if(data[listFields[list]])
			data[listFields[list]] = JSON.stringify(data[listFields[list]]);
	}

    try {
        let child = await new coop.Child().init(data).save();
        return util.sendResponse({ success: true });
    } catch(err) {
        return util.sendResponse(res, { success: false, error: "Error saving child profile: " + err });
    }
});

app.post('/submitFulfillment', async (req, res) => {
    let requiredFields = ["requestId", "assignedTo", "fulfilledStartTime", "fulfilledEndTime"];

    //Required fields
    for (field in requiredFields) {
        if (!req.body[requiredFields[field]]) {
            return util.sendResponse(res, { success: false, error: "Validation error: " + requiredFields[field] + " is required, but it is missing." });
        }
    }
    //Date validation
    let fStartTime, fEndTime;
    try {
        fStartTime = new Date(req.body.fulfilledStartTime);
        fEndTime = new Date(req.body.fulfilledEndTime);
    } catch (err) {
        return util.sendResponse(res, { success: false, error: "Date validation error." });
    }
    if (fEndTime < fStartTime) {
        return util.sendResponse(res, { success: false, error: "Date validation error: End time must be later than start time." });
    }


    /*
     * WIP
     * 1) Validate input
     * 2) Check to see if fulfillment information already exists
     * 
     */ 

    try {
        let request = await new coop.Request().load(req.body.requestId);
        if(!request.hasData)
            return util.sendResponse(res, { success: false, error: "Unable to find request." });
        if(request.fulfilled)
            return util.sendResponse(req, { success: false, error: "This request has already been archived, and cannot be altered. Please contact your group administrator if adjustments are needed." });
        let fulfillmentData = [];
        if(!Array.isArray(request.fulfillment))
            request.fulfillment = [];
        for(let a in req.body.assignedTo) {
            if(request.requestedBy == req.session.userId || req.body.assignedTo[a] == req.session.userId) {
                for(let f in request.fulfillment) {
                    if(req.body.assignedTo[a] == request.fulfillment[f].userId) {
                        try {
                            let fStartTime = new Date(req.body.fulfilledStartTime[a]);
                            let fEndTime = new Date(req.body.fulfilledEndTime[a]);
                            if((Math.floor(fStartTime.getTime() / 1000)) != request.fulfillment[f].startTime) {

                            }
                        } catch(err) {

                        }
                        break;
                    } else {
                        try {
                            let fStartTime = new Date(req.body.fulfilledStartTime[a]);
                            let fEndTime = new Date(req.body.fulfilledEndTime[a]);
                            if(fStartTime >= fEndTime)
                                return util.sendResponse(res, { success: false, error: "Fulfillment start time must be earlier than fulfillment end time." });
                            let fData = {
                                userId: req.body.assignedTo[a],
                                start: Math.floor(fStartTime.getTime() / 1000),
                                end: Math.floor(fEndTime.getTime() / 1000)
                            };
                            fData.diff = fData.end - fData.start;
                            fulfillmentData.push(fData);
                        } catch(err) {
                            return util.sendResponse(res, { success: false, error: "Fulfillment date validation error." });
                        }
                    }
                }
            }
        }




        await db.update({
            table: "Requests",
            values: {
                requestId: req.body.requestId,
                assignedTo: req.body.assignedTo,
                fulfillStartTime: req.body.fulfilledStartTime,
                fulfillEndTime: req.body.fulfilledEndTime,
                fulfilled: true
            }
        });
    } catch (err) {
        return util.sendResponse(res, { success: false, error: "Error getting request: " + err });
    }
    try {
        await exchangeHours({ requestId: req.body.requestId });
    } catch (err) {
        return util.sendResponse(res, { success: false, error: "The request was updated, but hours were not exchanged. Please contact your site administrator and reference request ID " + req.body.requestId });
    }

    return util.sendResponse(res, { success: true });
});

//Start her up!
https.createServer(sslOptions, app).listen(port, () => console.log("HTTPS server started - listening on port " + port + "."));