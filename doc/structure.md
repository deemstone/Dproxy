软件结构
=======

* 一个核心的HttpServer
* 一个维护规则列表的sifter
* 一些Handler
* 一个输入输出框架
* 多个UI(命令行/GUI)

HttpServer负责接收浏览器请求,收到请求送到sifter中检查,如果找到规则,调用相应的Handler处理