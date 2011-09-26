/*
 * 管理路由列表
 * 代理程序直接读取列表/控制程序操作列表
 */
var staticServer = {
	rewrite: ["^\/[ab]?([0-9]+)\/(.*)", "/$2" ],
	location: {
		//'/webpager/': 'remote:10.2.16.123'//,
		'/jspro/xn.app.webpager.js': ['remote', '10.2.16.123'],
		'/jspro/pager-channel6.js': ['remote', '10.2.16.123']
		//'/apps/alumna/': 'local:/Users/Lijicheng/htdocs/xn.static/apps/alumna/',
		//'~ /apps/alumna/(.*)\.js': 'local:/Users/Lijicheng/htdocs/xn.static/apps/alumna/$1.js'  //还没有实现
	},
	domain: ['remote','10.2.74.90']
};

//全局通用的完全匹配
exact = {
	'http://wpi.renren.com/wtalk/ime.htm?v=5': ['local', '/Users/Lijicheng/htdocs/ime.htm']
	//'/a20933/n/core/base-all.js': 'local:/Users/Lijicheng/htdocs/xn.static/n/core/base-all.js',
	//'/a20933/jspro/xn.app.addFriend.js': 'local:/Users/Lijicheng/htdocs/xn.static/jspro/xn.app.addFriend.js',
	//'/a20993/jspro/base-old.js': 'http://s.xnimg.cn/a20993/jspro/base.js',
	//'/a20993/jspro/xn.app.addFriend.js': 'remote:10.2.16.161'
};
module.exports.exact = exact;

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
module.exports.sections = sections;

//我们支持分组功能!!哈哈
//这个分组列表这样实现(合并和单独关闭):
//分组下存储的信息每条只对应一个记录(location/domain/rewrite/excat)
//通过'引用计数'的类似原理,只要有相同的规则配置,就把计数+1
//禁用一组配置的时候,相同配置计数-1,如果计数变0,在路由表中删除这个规则.
//主要有两类规则: location & 特殊属性(rewrite)
var groups = {
	webpager: [
		{ scope: 'xnimg.cn', location: '/jspro/xn.app.webpager.js', handler: ['remote', '10.2.16.123'] },  //普通location
		{ scope: 'xnimg.cn', location: '/jspro/pager-channel6.js', handler: ['remote', '10.2.16.123'] },
		{ scope: '*', location: 'http://wpi.renren.com/wtalk/ime.htm?v=5', handler: ['local', '/Users/Lijicheng/htdocs/ime.htm'] } //excat全路径匹配
	],
	xnimg: [
		{ scope: 'xnimg.cn', location: '*', handler: ['remote', '10.2.74.90'] }, //域名默认handler
		{ scope: 'xnimg.cn', rewrite: ["^\/[ab]?([0-9]+)\/(.*)", "/$2" ] }  //rewrite
	]
};
//在分组的列表array上添加自定义属性isEnabled来标示启用状态

//启用一个分组的规则
exports.enable = function(group){
	if( !(group in groups) ){
		console.log('<ERROR>: No group Named '+ group);
		return;
	}
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
function enableRule(rule){
	var code = 0; //0:只有这一条 1:计数+1 -1:冲突
	var a = splitRule(rule);
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
		map[key][2] = 0;
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
function splitRule(rule){
	if(rule.scope == '*'){  //全局的全路径匹配
		map = excat;
		key = rule.location;
		array = rule.handler;
	}else{  //特定域名的设置
		var domain = rule.scope;
		if( rule['rewrite'] ){ //首先判断是否特殊属性 [rewrite]
			map = sections[domain];
			key = 'rewrite';
			array = rule.rewrite;
		}else if(rule.location == '*'){ //domain的默认handler
			map = sections[domain];
			key = 'domain';
			array = rule.handler;
		}else{  //普通location的handler
			map = sections['location'];
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
