/*
 * 接收滚动信息,输出到指定管道
 * 输出数据为标准的cmd格式
 * 主要提供一个唯一的消息编号
 * 编号到达最大值自动归0重新开始
 * 滚动的关闭由消息处理来做
 * 将来可能做滚动内容的暂存
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
			write(m);
		}
	};
	if(task) task(pipe);
	return pipe;
};
