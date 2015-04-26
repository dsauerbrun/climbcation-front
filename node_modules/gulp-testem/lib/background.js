var testem = require('testem');
var api = new testem();
var data = JSON.parse(process.argv[2]);
api.startDev(data);
