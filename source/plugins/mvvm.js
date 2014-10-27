/**
 * MVVM功能模块
 * 生成一个MVVM模块，封装avalon框架
 * 生成了一个全局VM
 *
 */
define(function(require, exports){

	var	pubjs,
		MVVM = null,
		util = require('util'),
		globalVMConf = require('globalVMConf'),
		avalon = require('../libs/avalon/avalon.min.js');

	function initMVVM() {
		MVVM = {
			define : function(id, factory) {
				return avalon.define(id, factory);
			},
			scan : function(elem, vmodel) {
				return avalon.scan(elem, vmodel);
			},
			buildVMCtrl: function(vm, view_model) {
				var ex = {
					/**
					 * 重设vm
					 */
					reset: function() {
						util.each(view_model, function(v, k) {
							// 对象需要拷贝，否则会污染config
							if (util.isArray(v)) {
								vm[k] = util.extend(true, [], v);
							} else if (util.isPlainObject(v)) {
								vm[k] = util.extend(true, {}, v);
							} else {
								vm[k] = v;
							}
						});
						return vm;
					},
					/**
					 * 从数据对象中复制属性到vm中
					 * @param  {Object} data [数据对象]
					 * @param  {Object|Array} maps [不传则复制data中相同的字段到vm中;当为数组时，指定需要复制的字段;当为对象时，把data中字段名为key的值赋值给vm中的对应value字段]
					 */
					setData: function(data, maps) {
						util.each(data, function(v, k) {
							var key;
							if (util.isArray(maps) && util.index(maps, k) !== null || !maps) {
								key = k;
							}
							if (util.isPlainObject(maps) && (k in maps)) {
								key = maps[k];
							}
							if (key && (key in view_model)) {
								if (util.isObject(v)) {
									util.extend(true, vm[key], v);
								} else {
									vm[key] = v;
								}
							}
						});
						return vm;
					},
					/**
					 * 获取vm中的数据
					 * @param  {*} key  —— Default|Undefind  默认不传获取view_model中定义的全部非函数数据
					 *                  —— true              true则获取view_model中定义的全部含函数数据
					 *                  —— String|Number     字符串或数字为获取单项
					 *                  —— Array             传入属性名数组，获取指定属性名的属性，返回Object
					 *                  —— Object            from->to, 获取view_model中属性名为from的值，把该值赋给返回值的to属性
					 * @return {return} [由传入参数而定]
					 */
					getData: function(key) {
						var ud,
							data = {};

						if (util.isString(key) || util.isNumber(key)) {
							return vm.$model[key];
						} else if (util.isArray(key)) {
							util.each(key, function(k) {
								data[k] = vm.$model[key];
							});
						} else if (util.isObject(key)) {
							util.each(key, function(to, from) {
								data[to] = vm.$model[from];
							});
						}else if(key === ud) {
							util.each(view_model, function(k, v){
								if (!util.isFunc(v)) {
									data[k] = vm.$model[k];
								}
							});
						} else if (key === true) {
							return vm.$model;
						}
						return data;
					}
				}
				return ex;
			},
			globalVMDefineName : "global_view_model"
		};
		return MVVM;
	}
	function defineGlobalVM(globalVM){
		pubjs.GlobalVM = avalon.define(MVVM.globalVMDefineName, function(vm){
			if ( globalVM ) {
				for (var i in globalVM){
					if (globalVM.hasOwnProperty(i)){
						vm[i] = globalVM[i];
					}
				}
			}
		});
	}

	exports.plugin_init = function(context, callback){
		if (!MVVM) {
			pubjs = context;

			pubjs.MVVM = initMVVM();
			defineGlobalVM(globalVMConf);
			callback();
		}
	}
});