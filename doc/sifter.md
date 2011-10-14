Sifter设计
=========

整个代理服务器的核心就在这个"过滤器"上

接收到的http请求都要用这个sifter过滤,查看需要选用哪个Handler提供内容

主要设计内容:

* 过滤器的抽象模型
* 规则表(ruleList)的数据结构
* 规则表的操作方法
* 对外接口
* 规则配置文件格式

抽象模型
=======

每次收到的请求**目标**都是一个url = domain + uri 

url与现有*规则表*匹配,查到对应的*Handler* - method:参数/路径/ip


规则表:
=========

一个匹配规则对应一个Handler

一个匹配规则可以匹配多个url

Handler是可以定制,扩展更多类型的

规则表方便管理,支持分组的启用和停用

每条规则可以单独启用和停用

匹配过程:
-------

url拆分成domain和uri两部分处理

对uri做预处理(比如 rewrite)

首先,domain查看表中是否存这个域名

接着,查看这个域名下是否有相匹配的规则

如果没有找到相匹配的规则,查看是否domain有指定全域的默认Handler(类似绑host)

如果什么都没找到,默认从线上取内容原样返回.

表操作:
------

启用/停用一条规则

启用/停用一个分组的规则

添加一条规则到某分组

删除一条规则

查看所有规则(分组/规则/启用状态)

接口定义:
--------

* 启用/停用一分组: enableGroup/disableGroup (groupName)
* 启用/停用一规则: enableRule/disableRule ()  #TODO:规则的唯一标示
* 添加一条规则: addRule ('domain/匹配规则', 'local:/var/www/jspro/base.js' );
* 删除一条规则: delRule ()
* 获取分组列表: listGroups (content) 包括启用状态 是否包含规则列表
* 获取某分组规则列表: listRules (groupName)


实现方案:
-------

设计程序内部表示规则表的数据结构

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


配置文件:
--------

写配置文件的时候 exact一定要写全路径,比如'www.baidu.com'实际请求的url是'http://www.baidu.com/'

多条规则冲突的情况,简单的按照启用的顺序过滤(早启用的有效).处理的过程中可以查看请求具体是被哪个分组的哪条规则处理的.

Handler:
========

类型:
-----

remote:10.2.16.161  //从另一台测试机上取内容(相当于原来的绑host)
local:/var/www/jspro/base.js  //本地文件or文件夹
http://xnimg.cn/jspro/base.js  //从线上机器取内容
fastcgi:127.0.0.1:8080


第一步 : 拿到url resolve 查看是否匹配某个vector
第二步 : 调用相应的method 取得资源返回

