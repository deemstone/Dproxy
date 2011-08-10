//临时使用的一个数据格式

var staticServer = {
	descript: '',
	exact: {
		'/a20933/n/core/base-all.js': 'file:/Users/Lijicheng/htdocs/xn.static/n/core/base-all.js',
		'/a20933/jspro/xn.app.addFriend.js': 'file:/Users/Lijicheng/htdocs/xn.static/jspro/xn.app.addFriend.js',
		'/a20993/jspro/base-old.js': 'http://s.xnimg.cn/a20993/jspro/base.js',
		'/a20993/jspro/xn.app.addFriend.js': 'host:10.2.16.161'
	},
	rewrite: ["^\/[ab]?([0-9]+)\/(.*)", "/$2" ],
	location: {
		'/apps/alumna/': 'dir:/Users/Lijicheng/htdocs/xn.static/apps/alumna/',
	},
	domain: 'handler'
};

module.exports = {
	'xnimg.cn': staticServer,
	's.xnimg.cn': staticServer
};
