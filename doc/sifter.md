列表的设计
=========

整个代理服务器的核心就在这个列表上

设计这个列表的抽象形态,操作方式,对外的接口

抽象形态
-------

url匹配 - method:参数/路径/ip

url = domain + uri

可以对domain特殊设置一个过滤器,对url做个预处理

匹配的类型:
完全匹配 exactly
正则匹配 regax

method:
-------

remote:10.2.16.161  //从另一台测试机上取内容
http://xnimg.cn/jspro/base.js  //从线上机器取内容
local:/var/www/jspro/base.js  //本地文件or文件夹
fastcgi:127.0.0.1:8080


为了查找效率,分域名存储

domain1: {
	完全:{
		url1: 'method: 参数',
		url2: ''
	},
	rewrite: 'regax',
	location: {
		reg1: 'method: '
	},
	domain: ''
}

addURL('exact', 'xnimg.cn', '/jspro/base.js', 'local:/var/www/jspro/base.js' );
xnimg.cn - /jspro/base.js
addURL('regax', 'xnimg.cn', '/jspro/*.js', 'call:127.0.0.1:8080' );
xnimg.cn - /jspro/*.js

alisa domain1 domain2

第一步 : 拿到url resolve 查看是否匹配某个vector
第二步 : 调用相应的method 取得资源返回
