软件结构
=======

* 一个核心的HttpServer
* 一个维护规则列表的sifter
* 一些Handler
* 一个输入输出框架
* 多个UI(命令行/GUI)

HttpServer负责接收浏览器请求,收到请求送到sifter中检查,如果找到规则,调用相应的Handler处理

method输入格式规范

[55](GET|online) --> http://fxfeeds.mozilla.com/zh-CN/firefox/headlines.xml
[55] - 302 <-- text/html; charset=iso-8859-1

三个时机:

* 收到请求: HTTP请求方式  Method方法  最终目标资源
* 最终response返回: 状态码  content-type
* 任何数据