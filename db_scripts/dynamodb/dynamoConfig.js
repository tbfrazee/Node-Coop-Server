AWS.config.update({
	region: "us-west-2",
	endpoint: "http://localhost:8000",
	accessKeyId: "fakeMyKeyId",
	secretAccessKey: "fakeSecretAccessKey"
});

var dynamoDb = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();