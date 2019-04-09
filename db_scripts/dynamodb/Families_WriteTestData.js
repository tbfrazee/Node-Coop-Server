var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-west-2",
  endpoint: "http://localhost:8000",
  accessKeyId: "fakeMyKeyId",
  secretAccessKey: "fakeSecretAccessKey"
});

var dynamodb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

var params = {
	TableName: "Families",
	Item: {
		familyId: "Family1",
		emergencyContacts: [
			{
				name: "Jenny",
				relation: "Grandmother",
				phone: "867-5309"
			},
			{
				name: "Tommy",
				relation: "Grandfather",
				phone: "867-5310"
			}
		],
		children: [
			{
				name: "Ricky",
				gender: "Male",
				birthdate: 1529619750,
				allergies: {
					food: [
						{name: "Shellfish", treatment: "Go to emergency room"},
						{name: "Peruvian salt", treatment: "Peruvian pepper"}
					],
					medicine: [
						{name: "Alka-Selzter", treatment: "Beans"}
					],
					other: [
						{name: "The patriarchy", treatment: "Dismantle society, rebuild from the ashes."}
					]
				},
				bedtimeRoutine: "Draw chalk pentagram. Summon Chrognoradon, Demon Lord of Sleep. Offer goat."
			}
		]
	}
}

docClient.put(params, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success", data);
  }
});