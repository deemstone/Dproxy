/*
 * 接收滚动信息,输出到指定管道
 */

var unid = 0;
var maxid = 100;  //滚动列表最大长度

/*
 * 处理输出的函数
 * @param message{obj} 标准message结构
 */
var output = function(message){
	console.log('<output>:', message);
};

//设置输出管道
exports.output = function(fun){
	if(!fun) return false;
	output = fun;
	return true;
};

//用来向roll写入一条标准格式信息
exports.write = function(message){
	output(message);
};

//新建一个条目
exports.add = function(task){
	if( ++unid >= maxid ){ unid = 0; }

	var pipe = {
		unid: unid,
		cmds: [],
		write: function(cmd, appendix){  //支持两种参数  只传appendix的{} 或者指定一个cmd , {}
			if(typeof arguments[0] == 'string'){  //如果第一个参数是个字符串
				var cmds = this.cmds.concat(arguments[0]);
				var appendix = arguments[1];
			}else{
				var cmds = this.cmds;
				var appendix = arguments[0];
			}

			var m = {
				cmds: cmds,
				param: this.unid
			};
			if(appendix) m.appendix = appendix;
			output(m);
		}
	};
	if(task) task(pipe);
	return pipe;
};
