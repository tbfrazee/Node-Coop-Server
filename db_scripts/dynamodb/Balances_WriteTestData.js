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
    "Balances": [
		{
			PutRequest: {
				Item: {
					"familyId": {"S": "Family1"},
					"hours": {"N": 5}
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