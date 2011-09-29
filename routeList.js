/*
 * 管理路由列表
 * 代理程序直接读取列表/控制程序操作列表
 */
var staticServer = {
	rewrite: ["^\/[ab]?([0-9]+)\/(.*)", "/$2" ,1],
	location: {
		//'/webpager/': 'remote:10.2.16.123'//,
		'/jspro/xn.app.webpager.js': ['remote', '10.2.16.123' ,1],
		'/jspro/pager-channel6.js': ['remote', '10.2.16.123' ,1]
		//'/apps/alumna/': 'local:/Users/Lijicheng/htdocs/xn.static/apps/alumna/',
		//'~ /apps/alumna/(.*)\.js': 'local:/Users/Lijicheng/htdocs/xn.static/apps/alumna/$1.js'  //还没有实现
	},
	domain: ['remote','10.2.74.90' ,1]
};

//全局通用的完全匹配
exact = {
	'http://wpi.renren.com/wtalk/ime.htm?v=5': ['local', '/Users/Lijicheng/htdocs/ime.htm' ,1]
	//'/a20933/n/core/base-all.js': 'local:/Users/Lijicheng/htdocs/xn.static/n/core/base-all.js',
	//'/a20933/jspro/xn.app.addFriend.js': 'local:/Users/Lijicheng/htdocs/xn.static/jspro/xn.app.addFriend.js',
	//'/a20993/jspro/base-old.js': 'http://s.xnimg.cn/a20993/jspro/base.js',
	//'/a20993/jspro/xn.app.addFriend.js': 'remote:10.2.16.161'
};
module.exports.exact = {}; //exact;

//域范围内的路由列表
var sections = {
	'xnimg.cn': staticServer,
	's.xnimg.cn': staticServer,
	'test.cooer.net': {
		//domain: 'remote:10.2.16.123'
	},
	'share.renren.com': {
		//domain: 'remote:10.3.16.13'
	},
	'status.renren.com': {
		//domain: 'remote:10.3.18.206'
	}
};
module.exports.sections = {}; //sections;

//我们支持分组功能!!哈哈
//这个分组列表这样实现(合并和单独关闭):
//分组下存储的信息每条只对应一个记录(location/domain/rewrite/exact)
//通过'引用计数'的类似原理,只要有相同的规则配置,就把计数+1
//禁用一组配置的时候,相同配置计数-1,如果计数变0,在路由表中删除这个规则.
//主要有两类规则: location & 特殊属性(rewrite)
var groups = {};
//var groups = {
//	webpager: [
//		{ scope: 'xnimg.cn', location: '/jspro/xn.app.webpager.js', handler: ['remote', '10.2.16.123'] },  //普通location
//		{ scope: 'xnimg.cn', location: '/jspro/pager-channel6.js', handler: ['remote', '10.2.16.123'] },
//		{ scope: '*', location: 'http://wpi.renren.com/wtalk/ime.htm?v=5', handler: ['local', '/Users/Lijicheng/htdocs/ime.htm'] } //exact全路径匹配
//	],
//	xnimg: [
//		{ scope: 'xnimg.cn', setting:'domain', handler: ['remote', '10.2.74.90'] }, //域名默认handler
//		{ scope: 'xnimg.cn', setting:'rewrite', handler: ["^\/[ab]?([0-9]+)\/(.*)", "/$2" ] }  //rewrite
//	]
//};
//在分组的列表array上添加自定义属性isEnabled来标示启用状态

exports.groupContent = function(group){
	if( !(group in groups)){
		return false;
	}
	var g = groups[group];
	//转换成好理解的结构,exact,sections
	var router = {
		exact: {},
		sections: {}
	};
	g.forEach(function(r,i){
		var a = splitRule(r, router);
		a.map[a.key] = a.array;
	});
	return router;
};

exports.listGroups = function(){
	var list = {};
	for(var group in groups){
		list[group] = groups[group].isEnabled;
	}
	return list;
};

//启用一个分组的规则
exports.enable = function(group){
	//*是个暗号,启用所有分组
	if(group == '*'){
		for(i in groups){
			arguments.callee(i);
		} 
		return;
	}

	if( !(group in groups) ){
		console.log('<ERROR>: No group Named '+ group);
		return;
	}
	//避免重复启用
	if(groups[group].isEnabled) return;

	var conflict = [];
	//遍历这个分组所有的规则,添加到路由表中
	groups[group].forEach(function(v,i){
		var code = enableRule(v);
		//如果冲突的话,记录这次冲突
		if(code == -1){
			conflict.push(v);
		}
	});

	//完成操作
	groups[group].isEnabled = true;  //标示这个分组已经启用
	console.log('Enabled Group: '+ group);
	if(conflict.length){
		console.log('<Conflict>: ', conflict);
	}
};

//停用一个分组的规则
exports.disable = function(group){
	//*是个暗号,停用所有分组
	if(group == '*'){
		exports.exact = {};
		exports.sections = {};
		for(i in groups){
			groups[i].isEnabled = false;
		} 
		return;
	}
	//避免重复操作
	if(!groups[group].isEnabled) return;

	if( !(group in groups) ){
		console.log('<ERROR>: No group Named '+ group);
		return;
	}
	//遍历这个分组,逐条delete
	groups[group].forEach(function(v,i){
		var code = disableRule(v);
	});

	//完成操作
	groups[group].isEnabled = false;  //标示这个分组已经停用
	console.log('Disabled Group: '+ group);
};

//把一个规则插入指定的map中
//判断是否有,值是否相同
//@param map{object} 把键值对插入这个map
//@param key{string} 
//@param value{array} 只能用0和1两个格子,第三个格子放置引用计数
//@param target{obj} {exact:{}, sections:{}}可以不是全局的那个exact和sections  暂时不用
function enableRule(rule, target){
	var code = 0; //0:只有这一条 1:计数+1 -1:冲突
	var a = splitRule(rule, target);
	var map = a.map,
		key = a.key,
		array = a.array;

	//判断是否有这个key
	if(key in map){
		if( isSameHandler(map[key], array) ){  //如果有,值是否相同
			map[key][2]++;  //计数+1
			code = 1;
		}else{
			//TODO: 有冲突,目前方案,直接覆盖,并给用户显示提示
			map[key] = array.slice(0).concat( ++map[key][2] );
			code = -1;
		}
	}else{  //没有这个key,直接set进去
		map[key] = array.slice(0);
		map[key][2] = 1;
	}
	return code;
}

//跟上面对应的,删除一个规则
function disableRule(rule){
	var code = 1;  //0:删除了这条 1:计数-1
	var a = splitRule(rule);
	var map = a.map,
		key = a.key;

	//判断是否有这个key
	if( !(key in map) ){
		return -1;
	}
	if( --map[key][2] <= 0 ){  //如果计数归零了
		delete map[key];  //删除这个属性
		return 0;
	}
	return 1;
}

//识别一条rule的类型
//设计想法: 把rule的操作抽象成 key和array的比较
//map是被操作的那个object, key是需要操作的那个键
//array统一只用0和1两个格子
function splitRule(rule, obj){
	var router = obj || exports;  //这个router可以是指定的一个空的{exact: {}, sections: {}}
	if(rule.scope == '*'){  //全局的全路径匹配
		map = router.exact;
		key = rule.location;
		array = rule.handler;
	}else{  //特定域名的设置
		var domain = rule.scope;
		var section = router.sections[domain];
		if( !section ){ section = router.sections[domain] = {}; }
		if( rule.setting ){ //首先判断是否特殊属性 setting
			map = section;
			key = rule.setting;
			array = rule.handler;
		}else{  //普通location的handler
			map = section.location;
			if(!map) map = section.location = {};
			key = rule.location;
			array = rule.handler;
		}
	}
	
	return {
		map: map,
		key: key,
		array: array
	};
}
//判断两个array的前两个元素是否相同
//同样适用rewrite
//return true/false;
function isSameHandler(a, b){
	if(a[0] == b[0] && a[1] == b[1]){
		return true;
	}
	return false;
}

//向配置中添加一条规则
//如果有重复,直接覆盖,相当于edit
//return 0:新加了一条 1:编辑了一条
exports.addRule = function(group, rule){
	var g = groups[group];
	var i = findRule(g, rule);
	var edit = 0;  //enableRule是否编辑模式调用
	if( i<0 ){  //这是个新的rule
		g.push(rule);
	}else{  //要编辑现有的rule
		g.splice(i,1, rule);
		edit = 1;
	}
	//如果这个分组是启用状态,得通知用户"原有设置已经被覆盖"
	if(g.isEnabled){
		enableRule(rule, edit);
	}
	return edit;
};

//从配置中添删除一条规则
//return -1(没有这个条目) 0正常删除了
exports.delRule = function(group, rule){
	var g = groups[group];
	var i = findRule(g, rule);
	if( i<0 ){
		return -1;
	}
	//如果这个分组刚好启用呢,禁用这个规则
	if( g.isEnabled ) disableRule( g[i] );

	g.splice(i, 1);  //从该组删除
	return 0;
};

//查看一个分组是否是启用状态
function isEnabled(group){
	return groups[group].isEnabled;
}

//找到跟rule匹配的设置
//只做比较,找到相同的那个规则,返回序号
function findRule(g, rule){
	var x = -1;
	//又是遍历,找到那一条
	for(var i=0; i<g.length; i++){
		if(g[i].domain == rule.domain){
			if( rule.rewrite && g[i].rewrite == rule.rewrite ){
				x = i;
				break;
			}else if( rule.location && g[i].location == rule.location){
				x = i;
				break;
			}
		}
	}
	return x;
}

var fs = require('fs');
var path = require('path');
//保存一个分组
var dir_base = __dirname;  //程序根目录
var dir_conf = path.join(dir_base, '/conf');
var dir_rule = path.join(dir_conf, '/rule');

//保存一个分组的规则到相应的文件
function saveGroup(group){
	var rules = groups[group];
	//if( !rules.isModified ) return 0; //没有修改过的话不需要保存
	//覆盖写入
	var fpath = path.join(dir_rule, group +'.rule');
	rules = JSON.stringify(rules, '', '\t'); //这里\t格式话输出的JSON
	fs.writeFileSync( fpath, rules, 'utf8');
}

//只负责加载指定的配置到groups中
//完全同步的函数
//@param filename{str} 带扩展名的文件名字符串
function loadGroup(filename){
	var fpath = path.join( dir_rule , filename);
	var content = fs.readFileSync(fpath, 'utf8');
	var ruleList = null;
	try{
		ruleList = JSON.parse(content);
	}catch(e){
		console.error('配置文件JSON解析出错: ', content);
		return -1;
	}
	
	var group = path.basename(filename, '.rule');
	if(ruleList){
		groups[group] = ruleList;
	}
}
//把指定分组保存到磁盘
exports.save = function(group){
	if(!group || group == '*'){  //保存所有分组
		for(var i in groups){
			saveGroup(i);
		}
		return;
	}
	if( !(group in groups)) return;
	saveGroup(group);
};

//重新加载一个分组文件的规则列表
var reload = exports.reload = function(filename){
	var group = path.basename(filename, '.rule');
	//停用分组
	var e = groups[group].isEnabled;
	exports.disable(group);
	//加载
	loadGroup( group +'.rule' );
	//重新启用分组
	if(e) exports.enable(group);
};

(function(){
	var rs = fs.readdirSync(dir_rule);
	rs.forEach(function(r,i){
		if( ! /\.rule$/.test(r) ) return;  //扩展名必须是rule的文件才是配置文件
		loadGroup(r);
		var fpath = path.join(dir_rule, r);
		//监视这个文件
		fs.watchFile(fpath, function(curr, prev){
			//console.info(curr, prev);
			if( Number(curr.mtime) == Number(prev.mtime) ) return;  //没有被modified,不用处理
			//---^ 这个Number将Date转换成整数来比较, 要不然两个object总是不相等
			reload(r);
		});
	});

	//读取配置信息,启用相应的分组
	var file_conf = path.join(dir_conf, '/dproxy.conf');
	var conf = fs.readFileSync( file_conf , 'utf8');
	conf = JSON.parse(conf);
	conf.enabledGroups.forEach(function(v,i){
		exports.enable(v);
	});

	//程序退出的时候保存groups的启用状态
	process.on('exit', function(){
		exports.save();
		var usedGroups = [];
		for(var i in groups){
			if(groups[i].isEnabled) usedGroups.push(i);
		}
		conf.enabledGroups = usedGroups;
		fs.writeFileSync(file_conf, JSON.stringify(conf), 'utf8');
	});
})();
