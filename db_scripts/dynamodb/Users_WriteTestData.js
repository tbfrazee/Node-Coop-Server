var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-west-2",
  endpoint: "http://localhost:8000",
  accessKeyId: "fakeMyKeyId",
  secretAccessKey: "fakeSecretAccessKey"
});

var dynamodb = new AWS.DynamoDB();

var params = {
  RequestItems: {
    "Users": [
		{
			PutRequest: {
				Item: {
					"id": {"S": "ABC" },
					"familyId": {"S": "Family1"},
					"firstName": {"S": "Boobies" },
					"lastName": {"S": "McBoobies" }
				}
			}
		},
		{
			PutRequest: {
				Item: {
					"id": {"S": "BCD" },
					"familyId": {"S": "Family1"},
					"firstName": {"S": "Titties" },
					"lastName": {"S": "McBoobies" }
				}
			}
		},
		{
			PutRequest: {
				Item: {
					"id": {"S": "CDE" },
					"familyId": {"S": "Family2"},
					"firstName": {"S": "Boner" },
					"lastName": {"S": "Van Penis" }
				}
			}
		},
		{
			PutRequest: {
				Item: {
					"id": {"S": "DEF" },
					"familyId": {"S": "Family3"},
					"firstName": {"S": "Anus" },
					"lastName": {"S": "Assholington" }
				}
			}
		}
    ]
  }
};

dynamodb.batchWriteItem(params, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success", data);
  }
});