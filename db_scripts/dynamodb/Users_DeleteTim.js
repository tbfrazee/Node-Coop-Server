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
    TableName : "Users",
	Key: {
		id: "10106665367417093"
	}
};

docClient.delete(params, function(err, data) {
    if (err) {
        console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Deleted item. Table description JSON:", JSON.stringify(data, null, 2));
    }
});