/*
 * 滚动信息
 */
exports.info = function(){};

exports.on = function(){
	exports.info = function(message){
		console.log(message);
	};
};

exports.off = function(){
	exports.info = function(){};
};
