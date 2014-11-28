define(function(require,exports) {
	var pubjs = require('pubjs');
	// var $ = require('jquery');
	// var util = require('util');
	var view = require('@base/view');
	var dialog = require('@base/dialog');

	// 侧边栏
	var Sidebar = view.container.extend({
		init:function(config){
			config = pubjs.conf(config, {
				'childs': null // 子模块uri
			});

			this.$module = null; // 当前激活子模块

			this.Super('init', arguments);
		},
		afterBuild:function(){
			var c = this.getConfig();

			// 按序创建子项目
			for(var name in c.childs){
				this.createAsync(name, c.childs[name], {
					target: this.$el
				});
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
		toggleActive: function(module){
			// 移除其他项目的激活状态
			this.$el.find('.M-sidebarItemAct').removeClass('M-sidebarItemAct');

			if(module !== false){
				module.addClass('M-sidebarItemAct');
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
		}
	});
	exports.base = Sidebar;

	// 单个项目 -点击项目出现弹框
	var Item = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				'class': 'M-sidebarItem',
				'popwinItem': '' // 创建在弹框里的项目
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
			if(!this.$el.hasClass('M-sidebarItemAct')){
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
			this.createAsync('popwinItem', c.popwinItem, {
				target: popwin.getDOM(),
				data: this.$data,
				value: this.$value
			});

			// 更新弹框位置
			popwin.show();
			var position = this.getPosition(this.$el, popwin.$el);
			popwin.update(position);
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