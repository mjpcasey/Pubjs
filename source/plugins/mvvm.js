/**
 * MVVM功能模块
 * 生成一个MVVM模块，封装avalon框架
 * 生成一个全局VM
 *
 */
define(function(require, exports){
	var avalon = require('../libs/avalon/avalon.min.js'),
		pubjs,
		ajaxId = 0,
		MVVM = null,
		pluginCallback = null,
		vmJsonPath = '/data/grobalVM.json';

	function initMVVM() {
		MVVM = {
			define : function(id, factory) {
				return avalon.define(id, factory);
			},
			scan : function(elem, vmodel) {
				return avalon.scan(elem, vmodel);
			}
		};
		return MVVM;
	}

	// 加载全局变量定义文件
	function loadGrobalVM(callback){
		pluginCallback = callback;
		if (pubjs && pubjs.data && pubjs.data.get){
			if (ajaxId){
				pubjs.data.abort(ajaxId);
			}
			ajaxId = pubjs.data.get(vmJsonPath, onLoadGrobalVM);
		}
	}
	function onLoadGrobalVM(err, data){
		ajaxId = 0;
		if (!err){
			defineGrobalVM(data);
		}
		pluginCallback();
	}
	function defineGrobalVM(vmJson){
		pubjs.GrobalVM = MVVM.define('grobal_view_model', function(vm){
			for (var i in vmJson){
				if (vmJson.hasOwnProperty(i)){
					vm[i] = vmJson[i];
				}
			}
		});
	}

	exports.plugin_init = function(context, callback){
		if (!MVVM) {
			pubjs = context;

			pubjs.MVVM = initMVVM();
			loadGrobalVM(callback);
		}
	}
});