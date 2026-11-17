// Throw httpError(400, 'message') anywhere in a route; the error handler sends it to the client.
module.exports = (status, message) => Object.assign(new Error(message), { status });
