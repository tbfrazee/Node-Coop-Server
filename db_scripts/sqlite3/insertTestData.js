const sqlite3 = require('better-sqlite3');
const db = new sqlite3("../../db/coop.db");

let stmt;

function tx(params) {
	db.prepare("BEGIN TRANSACTION;").run();
	for(a in params) {
		stmt.run(params[a]);
	}
	db.prepare("END TRANSACTION;").run();
}

stmt = db.prepare("INSERT INTO Users (familyId, firstName, lastName, bio, email, phone, contactPref, training) VALUES ($familyId, $firstName, $lastName, $bio, $email, $phone, $contactPref, $training);");
let users = [{
	userId: "1",
	familyId: 1,
	firstName: "Bob",
	lastName: "Boberson",
	bio: "Hi I'm Bob",
	email: "bob@bob.bob",
	phone: "5555555555",
	contactPref: "email",
	training: ""
},{
	userId: "2",
	familyId: 1,
	firstName: "Bobette",
	lastName: "Boberson",
	bio: "Hi I'm Bob's hot wife",
	email: "bobette@bob.bob",
	phone: "5555555556",
	contactPref: "FB",
	training: ""
},{
	userId: "3",
	familyId: 2,
	firstName: "Sigourney",
	lastName: "Weaver",
	bio: "I fight aliens with construction equipment.",
	email: "sweaver@internet.com",
	phone: "5555556789",
	contactPref: "",
	training: ""
},{
	userId: "4",
	familyId: 3,
	firstName: "Bill",
	lastName: "Paxton",
	bio: "Hurr Hi I'm Bill",
	email: "bill@com.internet",
	phone: "5555556780",
	contactPref: "text",
	training: ""
}];

tx(users);

stmt = db.prepare("INSERT INTO Families (address, household, emergencyContacts, adults, children, pets, comment) VALUES ($address, $household, $emergencyContacts, $adults, $children, $pets, $comment);");
let families = [{
	address: "123 Bobstone St",
	household: "house",
	emergencyContacts: "[{name: 'Robert', phone: '5555551234'}]",
	adults: "[{name: 'Bob', relation: 'Bob'}, {name: 'Bobette', relation: 'Hot wife'}]",
	children: "[{name: 'Ezekiel' birthdate: 9999}]",
	pets: null,
	comment: "Hi we're the Bobs!"
},{
	address: "123 Prometheus St",
	household: "house",
	emergencyContacts: "[{name: 'Ellen', phone: '5555551234'}]",
	adults: "[{name: 'Sigourney', relation: 'Me'}]",
	children: "[{name: 'Crab' birthdate: 9999}]",
	pets: "[{name: 'Alien', breed: 'alien', type: 'alien'}]",
	comment: "Don't come here"
},{
	address: "123 Bill Paxton St",
	household: "apartment",
	emergencyContacts: "[{name: 'Bill Paxton', phone: '5555551234'}]",
	adults: "[{name: 'Bill', relation: 'Hurr'}, {name: 'Paxton', relation: 'Hi'}]",
	children: "[{name: 'Bill Paxton' birthdate: 9999}]",
	pets: null,
	comment: "Imma be da billest packston of dem all"
}];

tx(families);

stmt = db.prepare("INSERT INTO Requests (requestedBy, familyId, startTime, endTime, children, comment, assignedTo, fulfillTimes, fulfilled) VALUES ($requestedBy, $familyId, $startTime, $endTime, $children, $comment, $assignedTo, $fulfillTimes, $fulfilled);");
let requests = [{
	requestedBy: "1",
	familyId: 1,
	startTime: 999,
	endTime: 9999,
	children: 1,
	comment: "Plx do dis",
	assignedTo: null,
	fulfillTimes: null,
	fulfilled: null
},{
	requestedBy: "3",
	familyId: 2,
	startTime: 999,
	endTime: 9999,
	children: 2,
	comment: "Do it",
	assignedTo: "4",
	fulfillTimes: "[{start: 999, end: 9999}]",
	fulfilled: 1
},{
	requestedBy: "3",
	familyId: 2,
	startTime: 9999,
	endTime: 99999,
	children: 2,
	comment: "Do it again",
	assignedTo: "2,4",
	fulfillTimes: null,
	fulfilled: null
}];

tx(requests);

stmt = db.prepare("INSERT INTO Children (familyId, name, gender, birthdate, medicalContact, medicalConditions, medications, medicationAllergies, foodAllergies, otherAllergies, miscMedical, behavior, mealRoutine, bedRoutine) VALUES ($familyId, $name, $gender, $birthdate, $medicalContact, $medicalConditions, $medications, $medicationAllergies, $foodAllergies, $otherAllergies, $miscMedical, $behavior, $mealRoutine, $bedRoutine);");
let children = [{
	familyId: 1,
	name: "Bobbert",
	gender: "Female",
	birthdate: 99999,
	medicalContact: "{docName: 'GOD', docAddress: 'WHEREVER', docPhone: '5555555555'}",
	medicalConditions: "[{name: 'extralegitis', description: 'got an extra leg'}]",
	medications: null,
	medicationAllergies: null,
	foodAllergies: null,
	otherAllergies: null,
	miscMedical: "3 legs",
	behavior: "Ornary",
	mealRoutine: "Feeds on affection",
	bedRoutine: "Never sleeps"
},{
	familyId: 1,
	name: "Alien",
	gender: "Male",
	birthdate: 99999,
	medicalContact: "{docName: 'GOD', docAddress: 'WHEREVER', docPhone: '5555555555'}",
	medicalConditions: "[{name: 'mouthinmouthitis', description: 'got an extra mouth'}]",
	medications: null,
	medicationAllergies: null,
	foodAllergies: null,
	otherAllergies: null,
	miscMedical: "2 mouths",
	behavior: "Crawls through bents",
	mealRoutine: "Feeds on flesh",
	bedRoutine: "Never sleeps"
}];

tx(children);