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
    "Requests": [
		{
			PutRequest: {
				Item: {
					"requestId": {"S": "5309" },
					"familyId": {"S": "Family1"},
					"requestedBy": {"S": "10106665367417093"},
					"children" : {"SS": ["Ricky", "Bobby"]},
					"assignedTo": {"S": "DEF" },
					"requestStart": {"N": Math.floor(1529177666402 / 1000).toString()},
					"requestEnd": {"N": Math.floor(1529177667402 / 1000).toString()},
					"fulfilled": {"BOOL": false},
					"comment": {"S": "Do the stuff, plox."}
				}
			},
			PutRequest: {
				Item: {
					"requestId": {"S": "5309" },
					"familyId": {"S": "Family1"},
					"requestedBy": {"S": "ABC"},
					"children" : {"SS": ["Tommy"]},
					"assignedTo": {"S": "BCD" },
					"requestStart": {"N": Math.floor(1529177666402 / 1000).toString()},
					"requestEnd": {"N": Math.floor(1529177667402 / 1000).toString()},
					"fulfilled": {"BOOL": false},
					"comment": {"S": "DO IT"}
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