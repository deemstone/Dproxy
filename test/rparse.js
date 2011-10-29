var fs = require('fs');
var assert = require('assert');

var Config = require('../RParser.js');

//要的就是这个结果!!!
var target = []; 
target['handler'] = [ 
		'huihua-static  remote []',
		'wentao-static  remote []',
		'jicheng-static  remote [ ip: 10.2.16.123; ]' 
	];
target['oneline'] = [ 
		'http://www.baidu.com  jicheng-static',
		'http://wentao.xnimg.cn/* wentao-static' 
	];
target['s.xnimg.cn,a.xnimg.cn'] = [ 
		'rewrite   ^/[ab]?([0-9]+)/(.*)   /$2',
		'default  jicheng-static',
	];
target['s.xnimg.cn,a.xnimg.cn']['location'] = [ 
		  '/jspro/xn.app.webpager.js   jicheng-static',
		  '/jspro/pager-channel6.js',
		  '/n/core/modules/webpager/webpager.css',
		  '/n/core/res/webpager/cssimg/webpager.css' 
		];
target['wpi.renren.com'] = [ 
		'/wtalk/ime.htm?v=5  jicheng-static' 
	];

var finalTarget = {
	enabled: false,
	handlers: { 
		'huihua-static': { method: 'remote' },
		'wentao-static': { method: 'remote' },
		'jicheng-static': { ip: '10.2.16.123', method: 'remote' } 
	},
	settings: {},
	rules: 
	[ 
		{ 
			domain: 'wentao.xnimg.cn',
			patten: '/*',
			handler: 'wentao-static' 
		},
		{ 
			domain: 'www.baidu.com',
			patten: '/',
			handler: 'jicheng-static' 
		},
		{ 
			domain: 's.xnimg.cn,a.xnimg.cn',
			patten: '/jspro/xn.app.webpager.js',
			handler: 'jicheng-static' 
		},
		{ 
			domain: 's.xnimg.cn,a.xnimg.cn',
			patten: '/jspro/pager-channel6.js',
			handler: 'jicheng-static' 
		},
		{ 
			domain: 's.xnimg.cn,a.xnimg.cn',
			patten: '/n/core/modules/webpager/webpager.css',
			handler: 'jicheng-static' 
		},
		{ 
			domain: 's.xnimg.cn,a.xnimg.cn',
			patten: '/n/core/res/webpager/cssimg/webpager.css',
			handler: 'jicheng-static' 
		},
		{ 
			domain: 'wpi.renren.com',
			patten: '/wtalk/ime.htm?v=5',
			handler: 'huihua-static' 
		} 
	] 
};

var filepath = '../conf/rule/webpager.rule';
fs.readFile(filepath, "utf8", function(err, file) {
	if(!err) {

		var string = file;
		var rs = Config.parse( string );
		console.log(rs);

		assert.deepEqual(rs, finalTarget, '解析出来的分组信息跟目标不符!!');
		console.log('成功!');

		//next(rs);
	}else{
		console.log(err);
	}
});


// -- 解析Handler


function next(table){
	//console.log(' ==========> buildHandler测试 <=============');
	//var hStr = 'huihua-static   remote [ip:10.2.16.68] ';
	//console.log( buildHandler(hStr) );
	
	//console.log(' ==========> buildRulesList测试 <=============');
	
	
};
