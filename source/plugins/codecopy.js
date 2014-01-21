/**
 * 代码复制模块
 */
define(function(require, exports){
	var $ = require('jquery');
	var util = require('util');
	var app = null;
	var Module = null;
	var ModuleInstance = null;
	var und;

	var ModulePrototype = {
		init: function(config, parent){
			config = app.conf(config, {
				'width': 600,
				'data': null,
				"buttons": ['cancel', und],
				"buttonConfig":{
					"ok": und,
					"cancel": {"value": LANG("关闭"), "class": "uk-button-success"}
				},
				"class": 'M-dialogCodecopy',
				"showHead": false,
				"showClose": true
			});

			this.$tid = 0;
			this.$active = 0;
			this.$data = null;
			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			self.Super('afterBuild', arguments);

			var doms = self.$doms;
			// 生成标签容器
			doms.tabs = $('<ul class="uk-tab" />').appendTo(doms.body);
			// 生成说明消息容器
			doms.text = $('<p class="M-dialogCodecopyNote" />').appendTo(doms.body);
			// 生成代码显示框
			doms.code = $('<textarea class="M-dialogCodecopyCode" readonly />').appendTo(doms.body);
			// 操作提示信息
			doms.message = $('<p class="uk-text-success tc" />').appendTo(doms.body).hide();
			// 生成复制按钮代码
			doms.copy = $('<button class="uk-button M-dialogCodecopyCopy" />').text(LANG('复制代码')).appendTo(doms.body);

			// 绑定标签切换事件
			self.uiProxy(doms.tabs, 'li > a', 'click', 'eventChangeTab');
			self.uiBind(doms.copy, 'mouseenter', 'eventPrepareCopy');
		},
		// 切换标签回调事件
		eventChangeTab: function(evt, elm){
			elm = $(elm);
			var index = elm.attr('data-index');
			var item = this.$data[index];
			if (item){
				var doms = this.$doms;
				elm.parent()
					.addClass('uk-active')
					.siblings().removeClass('uk-active');
				doms.text.toggle(Boolean(item.text)).text(item.text);
				doms.code.val(item.code);
				doms.message.hide();
				this.$active = index;
			}
			return false;
		},
		// 准备复制内容事件
		eventPrepareCopy: function(evt, elm){
			var self = this;
			var item = self.$data[self.$active];
			if (item){
				util.clip(item.code, elm, self.afterCopy, self);
			}
		},
		// 复制完成提示
		afterCopy: function(){
			var self = this;
			var dom = self.$doms.message;
			var item = self.$data[self.$active];
			dom.text(item.tip || LANG('复制成功! 请把代码粘贴在你的网站！')).show();
			if (self.$tid){
				clearTimeout(self.$tid);
			}
			self.$tid = setTimeout(function(){
				dom.hide();
			}, 5000);
		},
		// 设置代码内容
		setData: function(data){
			var self = this;
			var doms = self.$doms;
			var tabs = doms.tabs.empty();
			var count = 0;

			self.$data = [];
			self.$active = 0;
			util.each(data, function(item){
				$('<li><a href="#" data-index="'+count+'">' + util.html(item.title) + '</a></li>').appendTo(tabs);
				self.$data.push(item);
				if (!util.has(item, 'text')){
					item.text = LANG('请将下面的代码插入您的网站里');
				}
				count++
				if (count == 1){
					doms.text.toggle(Boolean(item.text)).text(item.text);
					doms.code.val(item.code);
				}
			});
			if (count){
				tabs.find('li:first').addClass('uk-active');
				self.show();
				// 预加载粘贴板flash模块
				self.eventPrepareCopy(null, doms.copy);
			}else {
				self.$data = null;
			}
			return self;
		}
	};

	function ModuleFactory(baseModule, configs){
		Module = exports.codecopy = baseModule.extend(ModulePrototype);
		ModuleInstance = app.core.create('SYSTEM_CODECOPY', Module);
		ModuleInstance.setData(configs).show();
	}

	function CodeCopy(configs){
		if (ModuleInstance){
			ModuleInstance.setData(configs).show();
		}else {
			app.loadModule('@base/dialog.base', configs, ModuleFactory);
		}
	}

	exports.plugin_init = function(pubjs){
		app = pubjs;
		pubjs.codecopy = CodeCopy;
	}
});