define(function(require,exports){
	var pubjs = require("pubjs"),
		util = require('util'),
		$ = require("jquery"),
		view = require('@base/view'),
		content = require('@layout/v1/content');

	var Menu = view.container.extend({
		init: function(config) {
			config = pubjs.conf(config, {
				'class': 'appScenesPopGridMenu-wrap'
			});

			this.Super('init', arguments);
		},
		afterBuild: function() {
			var doms;
			var self = this;
			var container = self.getDOM();
			var html = $([
				'<div class="appScenesPopGridMenu-main">',
					'<ul class="appScenesPopGridMenu-content"></ul>',
				'</div>'
			].join('')).appendTo(container);

			doms = self.$doms = {
				wrap: html,
				main: $('.appScenesPopGridMenu-main', container),
				content: $('.appScenesPopGridMenu-content', container)
			};

			self.createAsync(
				'crlMenu_scroller',
				'@base/common/base.scroller',
				{
					"target": container,
					"content": doms.content,
					"dir": 'V',
					"size": 5,
					'pad': false,
					"watch": 200,
					'offset': 12
				}
			);

			self.reset();
		},
		reset: function() {
			var self = this;
			self.Super('reset');
			self.$data = {};
			return self;
		},
		setValue: function(key) {
			this.setItemActive(key);
			return this;
		},
		// 添加一项
		addItem: function(key, text, fixed) {
			var self = this;
			var doms = self.$doms;
			var data = self.$data;

			if (key in data) {
				self.editItem(key, text, fixed);
				return;
			}

			var item = $([
				'<li class="appScenesPopGridMenu-item" data-key="' + key + '">',
					'<span class="appScenesPopGridMenu-item-corner"/>',
					'<span class="appScenesPopGridMenu-item-content">' + text + '</span>',
					'<span class="appScenesPopGridMenu-item-ctrl">',
						'<span class="appScenesPopGridMenu-item-ctrl-wrap clear">',
							'<span class="appScenesPopGridMenu-item-removeBtn fr"><i class="uk-icon-times"></i></span>',
							'<span class="appScenesPopGridMenu-item-fixedBtn fl"><i></i></span>',
						'</span>',
					'</span>',
				'</li>'
				].join('')).appendTo(doms.content);
			var content = $('.appScenesPopGridMenu-item-content', item);
			var removeBtn = $('.appScenesPopGridMenu-item-removeBtn', item);
			var fixedBtn = $('.appScenesPopGridMenu-item-fixedBtn', item);
			var ctrl = $('.appScenesPopGridMenu-item-ctrl', item);

			data[key] = {
				text: text,
				el: item,
				content: content,
				fixedBtn: fixedBtn,
				removeBtn: removeBtn
			};

			self.updateItemFixed(key, fixed);

			self.uiBind(content, 'click',key ,'eventItemClick');
			self.uiBind(fixedBtn, 'click',key ,'eventFixedBtnClick');
			self.uiBind(removeBtn, 'click',key ,'eventRemoveBtnClick');
			self.uiBind(ctrl, 'mouseenter', key ,'eventCtrlEnter');
			self.uiBind(ctrl, 'mouseleave', key ,'eventCtrlLeave');
		},
		// 编辑文本
		editItem: function(key, text) {
			var self = this;
			var data = self.$data;

			if (key in data) {
				data[key].text = text;
				data[key].content.text(text);
			}
		},
		// 移除一项
		removeItem: function(key) {
			var self = this;
			var data = self.$data
			if (key in data) {
				var item = data[key];
				self.uiUnbind(item.el, 'click');
				self.uiUnbind(item.fixedBtn, 'click');
				self.uiUnbind(item.removeBtn, 'click');
				item.el.remove();
				delete data[key];
			}
		},
		// 更新某项锁定状态
		updateItemFixed: function(key, fixed) {
			var icon;
			var item = this.$data[key];

			if (item) {
				item.fixed = fixed;
				icon = item.fixedBtn.find('i');
				icon.removeClass('uk-icon-lock uk-icon-unlock-alt')
				if (fixed) {
					icon.addClass('uk-icon-lock');
				} else {
					icon.addClass('uk-icon-unlock-alt');
				}

				item.el.toggleClass('fixed', fixed);
			}
		},
		// 设置某项为选中状态
		setItemActive: function(key) {
			util.each(this.$data, function(item, k) {
				item.el.toggleClass('active', key === k);
			});
		},
		eventRemoveBtnClick: function(evt) {
			this.fire('menuItemRemove', evt.data);
		},
		eventItemClick: function(evt) {
			this.fire('menuItemTrigger', evt.data);
		},
		eventFixedBtnClick: function(evt) {
			this.fire('menuItemFixedToggle', evt.data);
		},
		eventCtrlEnter: function(evt, elm) {
			$(elm).addClass('hover');
		},
		eventCtrlLeave: function(evt, elm) {
			$(elm).removeClass('hover');
		}
	});

	var Base = view.container.extend({
		init: function(config) {
			config = pubjs.conf(config, {
				'max': 40,         // 最多允许存在的表格最大数
				'class': 'appScenesPopGridBlock'
			});

			this.Super('init', arguments);
		},
		afterBuild: function() {
			var doms;
			var self = this;
			var container = self.getDOM();

			$([
				'<div class="appScenesPopGridMain">',
					'<div class="appScenesPopGridMenu"></div>',
					'<div class="appScenesPopGridContent"></div>',
				'</div>',
				'<div class="appScenesPopGridCtrl">',
					'<div class="appScenesPopGridCtrlBtn">',
						'<i class="uk-icon-angle-right"/>',
					'</div>',
				'</div>'
			].join('')).appendTo(container);

			doms = self.$doms = {
				ctrl: $('.appScenesPopGridCtrl', container),
				main: $('.appScenesPopGridMain', container),
				menu: $('.appScenesPopGridMenu', container),
				content: $('.appScenesPopGridContent', container)
			};

			self.uiBind(doms.ctrl, 'click', 'eventCtrlClick');
			self.uiBind(window, 'resize.popGrid', 'eventViewResize');

			self.create('menu', Menu, {
				target: doms.menu
			});

			self.reset().updateSize();
		},
		reset: function() {
			var self = this;
			// 容器栈
			self.$containers = [];
			// 是否可见
			self.$isHidden = true;
			return self;
		},
		count: function() {
			return this.$containers.length;
		},
		updateSize: function() {
			var doms = this.$doms;
			var container = this.getContainer();
			var paddingLeft = parseInt(doms.main.css('paddingLeft'), 10);
			var paddingRight = parseInt(doms.content.css('paddingRight'), 10);

			container.height($(window).height());
			doms.content.width($(window).width() - doms.ctrl.width() - paddingLeft - paddingRight);
		},
		getItem: function(name) {
			var self = this;
			var list = self.$containers;
			return util.find(list, name, 'name');
		},
		/**
		 * config 说明
		 * @property {String}   type            subgrid类型  在config app/subgrid中配置
		 * @property {String}   name     [可选] 模块名称(传入相同名称在多次调用时不会创建新的模块)
		 * @property {Object}   param    [可选] 模块参数
		 * @property {String}   title    [可选] 菜单标题  可在subgrid配置中获取
		 * @property {Object}   config   [可选] 模块配置
		 * @property {Function} callback [可选] 模块回调
		 */
		// 增加一项
		addItem: function(opts) {
			if (util.isString(opts)) {
				opts = {type: opts };
			}

			var target;
			var container;
			var constructor;
			var self = this;
			var doms = self.$doms;
			var list = self.$containers;
			var type = opts.type;
			var title = opts.title;
			var name = opts.name || 'POP_GRID_CONTAINER' + util.guid();
			var subgridConfig = pubjs.config('app/subgrid/' + type) || {};
			var modulesConfig = subgridConfig.modules;
			var businessType = subgridConfig.type;
			var cont = self.getItem(name);

			if (util.isString(subgridConfig.title)) {
				title = subgridConfig.title;
			} else if (util.isFunction(subgridConfig.title)) {
				title = subgridConfig.title.call(null, opts, subgridConfig);
			}

			if (!util.isArray(modulesConfig)) {
				modulesConfig = [modulesConfig];
			}

			self.$isHidden = false;

			if (!cont){
				switch(businessType){
					case 'scroll':
						constructor = content.scroll;
					break;
					case 'sidebar':
						constructor = content.sidebar;
					break;
					case 'tabSidebar':
						constructor = content.tabSidebar;
					break;
					default:
						constructor = content.base;
					break;
				}

				target = $('<div class="appScenesPopGridSingle"></div>').appendTo(doms.content); //HACK: 解决container下模块定位错误的问题
				container = self.create(constructor, {target: target});

				cont = {
					name: name,
					type: type,
					businessType: businessType,
					param: opts.param,
					title: title || LANG('---'),
					wrap: target,
					modules: [],
					fixed: false,
					container: container
				};
				list.push(cont);
				self.$.menu.addItem(name, title, cont.fixed);

				util.each(modulesConfig, function(modconf) {
					if (util.isString(modconf)) {
						modconf = {uri: modconf};
					}

					container.createBusiness(
						'POP_GRID_MODULE' + util.guid(),
						modconf.uri,
						util.extend(
							opts.config,
							modconf.config,
							{param: modconf.param},
							{param: opts.param}
						),
						function(mod) {
							cont.modules.push(mod);
							if(util.isFunc(opts.callback)) {
								opts.callback.apply(null, [true, cont, opts].slice(arguments));
							}
						}
					);
				});

			} else if (cont.modules && util.isFunc(opts.callbacka)) {
				opts.callback.call(null, false, cont, opts);
			}

			self.showItem(name);

			while(list.length > this.getConfig('max')) {
				self.shiftItem();
			}

			return container;
		},
		// 移除最老的一项
		shiftItem: function(i) {
			var self = this;
			var list = self.$containers;
			var cont = list[i];
			if (!cont) {
				pubjs.alert(LANG('超出最大数量且无法移除'));
				return;
			}
			if (cont.fixed) {
				self.shiftItem(++i);
			} else if (cont.name) {
				self.removeItem(cont.name);
			}
		},
		// 移除某一项
		removeItem: function(name) {
			var self = this;
			var list = self.$containers;
			var cont = self.getItem(name);
			self.$.menu.removeItem(name);

			if (cont) {
				if (cont.container) {
					cont.container.destroy();
				}
				if (cont.wrap) {
					cont.wrap.remove();
				}
				util.remove(list, name, 'name');
			}

			if (!list.length) {
				this.hideSelf();
			} else {
				this.showItem(list[list.length - 1].name);
			}
		},
		// 激活某一项
		showItem: function(name) {
			var self = this;
			var list = self.$containers;
			util.each(list, function(cont) {
				var wrap = cont.wrap;
				if (!wrap) {
					return;
				}
				if (cont.name === name) {
					self.$.menu.setValue(name);
					wrap.show();
				} else {
					wrap.hide();
				}
			});
		},
		hideSelf: function() {
			var self = this;
			self.fire('popGridHide', function(){
				self.$isHidden = true;
			});
		},
		eventCtrlClick: function() {
			this.hideSelf();
			return false;
		},
		eventViewResize: function() {
			var self = this;

			clearTimeout(self.$timer);
			self.$timer = self.setTimeout(function() {
				if (!self.$isHidden) {
					self.updateSize();
				}
			}, 60);
		},
		onMenuItemRemove: function(ev) {
			this.removeItem(ev.param);
			return false;
		},
		onMenuItemTrigger: function(ev) {
			this.showItem(ev.param);
			return false;
		}
		,onMenuItemFixedToggle: function(ev) {
			var key = ev.param;
			var cont = this.getItem(key);

			if (cont) {
				cont.fixed = !cont.fixed;
				this.$.menu.updateItemFixed(key, cont.fixed);
			}
			return false;
		}
	});
	exports.base = Base;


});