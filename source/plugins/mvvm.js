/**
 * MVVM功能模块
 * 生成一个MVVM模块，封装avalon框架
 * 生成了一个全局VM
 *
 */
define(function(require, exports){

	var VMCtrl,
		pubjs,
		MVVM = null,
		util = require('util'),
		globalVMConf = require('globalVMConf'),
		avalon = require('@libs/avalon/avalon.min.js');

	function defineVMCtrl() {
		VMCtrl = pubjs.Class.extend({
			CONSTRUCTOR: function(vm ,view_model, module) {
				this.$ = vm;
				this.view_model = view_model;
				this.module = module;
			},
			/**
			 * 重设vm
			 */
			reset: function() {
				var vm = this.$;
				util.each(this.view_model, function(v, k) {
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
				var vm = this.$,
					view_model = this.view_model;
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
							vm[key] = util.extend(true, vm[key], v);
						} else {
							vm[key] = v;
						}
					}
				});
				return vm;
			},
			/**
			 * 设置VM顶级属性的值
			 */
			setItem: function(key, value) {
				this.$[key] = value;
				return value;
			},
			/**
			 * 通过属性链获取VM中单个字段的值
			 */
			getItem: function(uri) {
				return util.prop(this.$.$model, uri);
			},
			/**
			 * 获取vm中的数据
			 * @param  {*} key  —— Default|Undefind  默认不传获取view_model中定义的全部非函数数据
			 *                  —— true              true则获取view_model中定义的全部含函数数据
			 *                  —— Array             传入属性名数组，获取指定属性名的属性，返回Object
			 *                  —— Object            from->to, 获取view_model中属性名为from的值，把该值赋给返回值的to属性
			 * @return {return} [由传入参数而定]
			 */
			getData: function(key) {
				var ud,
					data = {},
					vm = this.$;

				if (util.isArray(key)) {
					util.each(key, function(k) {
						data[k] = vm.$model[k];
					});
				} else if (util.isObject(key)) {
					util.each(key, function(to, from) {
						data[to] = vm.$model[from];
					});
				} else if (key === ud) {
					util.each(this.view_model, function(k, v){
						if (!util.isFunc(v)) {
							data[k] = vm.$model[k];
						}
					});
				} else if (key === true) {
					return vm.$model;
				}
				return data;
			},
			/**
			 * 监听VM中的字段
			 * @param  {String}          uri     要监听的字段属性链
			 * @param  {Function|String} func    回调方法
			 * @param  {Object}          context 回调作用域（默认为当前module）
			 */
			watch: function(uri, func, context) {
				var name,
					parent = this.$,
					ns = (''+uri).split('/');

				while (ns.length){
					name = ns.shift();
					if (ns.length === 0) {break;}
					if (parent[name]) {
						parent = parent[name];
					} else {
						parent = null;
						break;
					}
				}

				context = context || this.module;

				if (util.isString(func)) {
					func = context[func];
				}

				if (parent && util.isFunc(parent.$watch)) {
					parent.$watch(name, function() {
						func.apply(context, arguments);
					});
				} else {
					pubjs.log('the watch field ' + uri + ' is not found');
				}
			},
			destroy: function() {
				this.$ = null;
				this.view_model = null;
				this.module = null;
				// TODO: 销毁当前模块的vm
			}
		});
	}
	function initMVVM() {
		MVVM = {
			define : function(id, factory) {
				return avalon.define(id, factory);
			},
			scan : function(elem, vmodel) {
				return avalon.scan(elem, vmodel);
			},
			buildVMCtrl: function(vm, view_model) {
				return new VMCtrl(vm, view_model);
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

			defineVMCtrl();
			pubjs.MVVM = initMVVM();
			defineGlobalVM(globalVMConf);
			callback();
		}
	}
});