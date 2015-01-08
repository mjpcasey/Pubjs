define(function(require,exports) {
	var pubjs = require('pubjs');
	var $ = require('jquery');
	var util = require('util');
	var view = require('@base/view');
	var dialog = require('@base/dialog');

	// 侧边栏
	var Sidebar = view.container.extend({
		init:function(config){
			config = pubjs.conf(config, {
				'class': 'M-sidebar',
				/**
				 * 子模块:
				 * 	1、数组形式
				 * 		[{name: 'xxx', uri:'xxx', config:'xxx'}];
				 * 	2、对象形式
				 * 		{name: uri}
				 */
				'items': []
			});

			this.$module = null; // 当前激活子模块

			this.Super('init', arguments);
		},
		afterBuild:function(){
			var el = this.$el;

			// 外部容器
			var wrapper = $('<div class="M-sidebarWrapper"></div>').appendTo(el);

			// 设定高度
			wrapper.height($(window).height()-$('.G-frameHeadWrapper').height());

			// 内部容器
			var container = $('<div class="content" />').appendTo(wrapper);

			// 滚动条
			this.createAsync('scroller', '@base/common/base.scroller', {
				'dir': 'V',
				'watch': 200,
				'target': wrapper,
				'content': container
			});

			var i;
			this.$items = {};	// 子模块
			var items = this.getConfig('items');

			// 若是对象，转成数组
			if(util.isObject(items) && !util.isArray(items)){
				var trans = [];
				for(i in items){
					trans.push({name: i, uri: items[i]});
				}
				items = trans;
			}

			// 按序创建子项目
			var name, elm;
			if(util.isArray(items)){
				for (i = 0; i < items.length; i++) {
					name = items[i]['name'];
					elm = $('<div class="M-sidebarLayout"/>').appendTo(container);
					this.createDelay(name, items[i]['uri'],
						util.extend(
							{},
							items[i]['config'],
							{'target': elm}
						)
					);

					this.$items[name] = {
						el: elm,
						status: true
					};

				}
				this.createDelay(true);
			}else{
				pubjs.error(LANG('数据格式不正确'));
			}

			// 弹框
			this.create('popwin', dialog.base, {
				'target': this.$el,
				'mask': 0,
				"position":{},
				"silence":false,
				"showHead": false,
				"showClose": false
			});
		},
		toggleItem: function(name, bool){
			var item = this.$items[name];

			if(item){
				var action;
				var status = item['status'];
				if(bool !== undefined ){
					action = bool ? 'show' : 'hide';
					status = bool ? true : false;
				}else{
					action = status ? 'show' : 'hide';
					status = !status;
				}

				item.el[action]();
			}else{
				pubjs.error('找不到 ['+name+' ]项目');
			}
		},
		toggleActive: function(module){
			// 移除其他项目的激活状态
			this.$el.find('.M-sidebarLayoutAct').removeClass('M-sidebarLayoutAct');

			if(module !== false){
				module.$el.parent().addClass('M-sidebarLayoutAct');
			}
		},
		onChildClick: function(ev){
			// 旧子模块实例
			var old = this.$module;

			if(old){
				// 销毁旧子模块
				// todo, 看业务需求，是否需要在此处发消息通知子模块
				old.get('popwinItem').destroy();
			}

			// 新子模块实例
			var child = this.$module = ev.param;

			// 更新激活样式
			this.toggleActive(child);

			// 返回弹框实例
			ev.returnValue = this.$.popwin;

			return false;
		},
		onDialogOk: function(ev){
			// 获取弹框项目中的选中值
			var value = this.$module.get('popwinItem').getValue();

			// 侧边栏子项目更新值
			this.$module.setValue(value);

			// 隐藏弹框
			this.$.popwin.hide();

			// 移除激活样式
			this.toggleActive(false);

			// 冒泡给父模块
			this.fire('sidebarFilter', {
				type: this.$module._.name,	//子模块名
				data: value					// 选中值
			});

			return false;
		},
		onDialogCancel: function(ev){
			// 移除激活样式
			this.toggleActive(false);

			return false;
		},
		onSYSResize: function(ev){
			var el = this.$el.find('.M-sidebarWrapper');
			var h = $(window).height()-$('.G-frameHeadWrapper').height()

			// 更新侧边栏高度
			el.css({
				'height': h,
				'min-height': h
			});

			// 更新侧边栏滚动条
			this.$.scroller.update();
		}
	});
	exports.base = Sidebar;

	// 单个项目 -点击项目出现弹框
	var Item = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'class': 'M-sidebarItem',
				'width': 500,
				'popwinItem': '',	// 创建在弹框里的项目
				'popwinConfig': ''	// 弹框项目配置项
			});

			this.$data = [];		// 数据项
			this.$value = [];		// 选中值

			this.Super('init', arguments)
		},
		afterBuild: function(){
			// 绑定元素点击事件
			this.uiBind(this.$el, 'click', 'eventClick');
		},
		// 项目点击事件
		eventClick: function(ev, elm){
			// 激活状态中禁用点击
			if(!this.$el.parent().hasClass('M-sidebarLayoutAct')){
				// 参数：模块实例
				this.fire('childClick', this, 'afterChildClick');
				return false;
			}
			return false;
		},
		afterChildClick: function(ev){
			var popwin = ev.returnValue; // 弹框容器
			this.buildPopwin(popwin);
		},
		buildPopwin: function(popwin){
			var c = this.getConfig();

			// 创建弹框中模块
			this.createAsync('popwinItem', c.popwinItem, util.extend({
				target: popwin.getDOM(),
				data: this.$data,
				value: this.$value
			}, c.popwinConfig));

			// 更新弹框位置
			popwin.show();
			if(c.width){
				popwin.css({ 'width': c.width});
			}
			var position = this.getPosition(this.$el.parent(), popwin.$el);
			popwin.update(position);
		},
		getValue: function(){
			return this.$value;
		},
		// 计算弹框定位
		getPosition: function(self, popwin){
			var top = self[0].offsetTop;

			// 模块的垂直位置如果大于屏幕高度的一半，居下定位；
			var height = document.body.clientHeight || document.documentElement.clientHeight;	// 屏幕高度
			if(top > (height/2)){
				// 两容器的差值
				var dif = self.outerHeight()-popwin.outerHeight();
				top+=dif;
			}
			return {
				top: top,
				left: -popwin.outerWidth()
			};
		}
	});
	exports.item = Item;



});