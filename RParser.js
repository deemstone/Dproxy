/*
 * 规则配置文件解析
 * 将字符串解析成程序内部可用的数据结构
 * 解析后的结构保存注释信息
 * 写回配置文件时带上原有的注释信息
 */

exports.parse = function(cStr){

	//建立一些常用的正则对象
	var RegExp_COMMENT = /(^|\s+)#.*/; //匹配所有注释(配置文件中的某一行) 可以用这个正则去掉所注释
	var RegExp_BLOCK = /\s*(.*)\s*{\s*$/;  //检测是否是一个Block开头 {符号前后可以有多个空格,一定是本行的结束
	var RegExp_BLOCK_OPEN = /^\s*{\s*$/;  //独占一行 BLOCK的开始
	var RegExp_BLOCK_END = /^\s*}\s*$/; //检测Block结束 一定独占一行
	var RegExp_BLANKLINE = /\s*/;  //空行

	var orig = cStr.split('\n');  //拆成一行一行的
	var path = [];  //正在解析的一行配置 所在的层级 path[0]就是当前正在解析的列表名
	var table = [];
	
	var i = 0;  //循环标示

	//实现方案(保留注释)
	//直接从配置文件生成sifter分组表格的初始结构
	//注释&空格信息 统一存储到一个列表中,按行号存储
	//每条记录都要对应的行号
	//序列化的过程,按行号取得对应的空格和注释
	//最后连成字符串
	
	//初始中间变量

	//从orig的第i行开始解析一个块(把整个配置文件当做一个大的块!!!)
	function parseBlock(){
		var table = [];
		var line;  //当前行的内容
		var r;  //用于临时存放正则匹配结果

		//从第i行开始逐行扫描,过程中碰到block的话,递归调用
		do{
			line = null;
			line = orig[i].replace(RegExp_COMMENT, '');  //删除注释

			//console.log('['+ i +']', line);

			if( line == '' ){  //空行 
				i++;
				continue;
			}

			if( RegExp_BLOCK_END.test(line) ){  //一个块的结束
				i++;
				return table;

			}else if( RegExp_BLOCK_OPEN.test(line) ){  //这才发现,原来上一行是个块
				path.unshift( table.pop() ); //进入一个块的解析
				i++;
				table[ path[0] ] = arguments.callee();
				path.shift(); //这个块处理完了

			}else if(r = line.match( RegExp_BLOCK ) ){  //立马就是一个块的开始
				//把新block的名字提取出来
				path.unshift( r[1] );
				i++;
				table[ path[0] ] = arguments.callee();
				path.shift();
				
			}else{  //属于当前block的一个条目
				//去除行首的所有空格和\t
				line = line.replace(/^\s*/, '');
				table.push(line);
				i++;
			}
		}
		while(i < orig.length);  //把所有行遍历完就被迫结束

		return table;
	}

	var table = parseBlock();
	return buildGroup(table);
};

//从原始的列表表格信息中建立分组的数据
function buildGroup(table){
	//解析出来的数据放在这里
	var group = {
		enabled: false,
		handlers: {},
		settings: {},
		rules: []
	};
	
	//obj.handlers = build_handlers(table.handler);
	if( table['handler'] ){
		var handlers = {};  //从table里建立出所有的分组局域handler
		table['handler'].forEach(function(h){
			h = buildHandler(h);
			handlers[ h.name ] = h.info;
		});
		group.handlers = handlers;
	}

	var setting = {'rewrite': '', 'default': ''};
	var oneline, _handler, _domain;  //上一条规则的handler,如果本条没有,沿用上一条的 当前处理的某个块的域

	for(var scope in table){
		if(scope == 'oneline'){  //最后处理这个特殊的list
			oneline = table[scope];
			continue;
		}
		if(scope == 'handler') continue;  //这里不处理handler块
		
		domain = scope;
		table[scope].forEach(function(l){
			//提取出第一个字符串,判断是否是某项setting
			l = l.split(/\s+/);
			var name = l.shift();
			if(name in setting){
				//TODO: 域名setting的实现方案还没定,暂时不理会
				//
			}else{ //如果是普通的一条规则,添加到表中
				_handler = l[0] || _handler;
				var rule = {
					domain: scope,
					patten: name,
					handler: _handler
				};
				group.rules.push( rule );
			}
		});

		if(table[scope]['location']){  //正了八经的规则列表
			_handler = null;
			table[scope]['location'].forEach(function(l){
				l = l.split(/\s+/);
				_handler = l[1] || _handler;
				var rule = {
					domain: scope,
					patten: l[0],
					handler: _handler
				};
				group.rules.push( rule );
			});
		}

	}

	if(oneline){
		_handler = null;
		oneline.forEach(function(l){
			l = l.split(/\s+/);
			//解析url 分成host和uri两部分
			_handler = l[1] || _handler;
			l = l[0].match(/(http:\/\/)?([^\/]*)(.*)$/);
			var url = {
				host: l[2],
				uri: l[3]
			};

			//TODO: 这里还应该支持绑host的操作  http://s.xnimg.cn/* handler

			//生成rule对象
			var rule = {
				domain: url.host,
				patten: url.uri || '/',  //如果只有域名,默认patten是根目录
				handler: _handler
			};

			//放到ruleList中
			group.rules.unshift(rule);
		});
	}

	return group;
}

//handler字串解析用到的正则表达式
var RegExp_HANDLER = /^([^\s]+)\s+([^\s]+)\s+\[(.*)\]\s*$/ ;  //没有空格(之前的处理都给去掉了) + 字符串 + 空格 + 字符串 + [:;格式的字符串]
//从格式中字符串提取handler信息
//参数: h是配置文件中描述handler的字符串
//返回: {name: '', info: {method: '', ...} }
function buildHandler(h){
	var r = h.match( RegExp_HANDLER );
	//console.log('<正则匹配结果>:', r);
	if(!r) return null;

	var param = parseCobj(r[3]);  //把[里面]那段字符串翻译成对象数据结构
	param['method'] = r[2];
	
	var handler = {
		name: r[1],
		info: param
	};
	
	return handler;
}

function parseCobj(cstr){
	//去掉任何空格
	cstr = cstr.replace(/\s+/g, '');
	var attrs = cstr.split(/[:;]/);  //全都隔开之后,数组中两两一对,碰到名字是空就停止(那是最后一个;号split产生的)

	var obj = {};  //内容都放到这里
	while(attrs[0]){  //
		obj[ attrs.shift() ] = attrs.shift();  //已经确认,js中赋值操作会先执行等号左边的那个shift()
	}

	return obj;
}
