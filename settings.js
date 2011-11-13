/*
 * 管理所有选项
 * 支持可视化的打印所有信息
 * 支持改变某选项之后执行特定任务
 * 支持配置的持久化存储和读取
 */
var path = require('path');
var fs = require('fs');
var Config = require('./RParser.js');

var config = {};  //配置文件的数据结构

var dir_base = __dirname;  //程序根目录
var filepath = path.resolve(dir_base, './conf/dproxy.conf');
if(path.existsSync(filepath)){
	//console.log2('settings准备读取dproxy.conf文件');
	var content = fs.readFileSync(filepath, "utf8");
	var table = Config.parseTable(content);

	table.forEach(function(line){
		if( 'string' == typeof line ){
			//这是一行配置,不是一个块
			line = line.split(/\s+/);
			var key = line.shift();
			config[key] = line[0];  //暂时先只取一个字串吧  // (line.length > 1) ? line : line[0];
		}
	});

	if(table['handler']){
		config['handler'] = Config.buildHandlerList(table['handler']);
	}
}
exports.config = config;

var setting = function(){};
setting.prototype = {
	_options: {},
	//
	//添加一个设置项
	option: function(opt ){
	
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
