/*
 * 管理所有选项
 * 支持可视化的打印所有信息
 * 支持改变某选项之后执行特定任务
 * 支持配置的持久化存储和读取
 */

var setting = function(){
	
};

setting.prototype = {
	_options: {},
	//
	//添加一个设置项
	option: function(opt, ){
	
	},

	//加载一个配置文件
	//param configFile
	load: function(file){
	
	
	},

	save: function(){
	
	},

	//getter
	get: function(){
	
	},

	//setter
	set: function(){
	
	}
};

exports.getPreference = function (file){
	var preference = new setting();
	preference.option('port', 7000);
};
