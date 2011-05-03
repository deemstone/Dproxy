var config = require('./config');

exports.serve = function(rs, response){
	console.log("--> : local "+ request.url);

	var filename = rs.path;
	path.exists(filename, function(exists) {
		if(!exists) {
			response.sendHeader(404, {"Content-Type": "text/plain"});
			response.write("404 Not Found\n");
			response.end();
			return;
		}
		
		fs.readFile(filename, "binary", function(err, file) {
			if(err) {
				response.sendHeader(500, {"Content-Type": "text/plain"});
				response.write(err + "\n");
				response.end();
				return;
			}
			response.sendHeader(200);
			response.write(file, "binary");
			response.end();
		});
	});
}
