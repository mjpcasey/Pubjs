define(function(require,exports){
	var pubjs = require("pubjs"),
		util = require('util'),
		// $ = require("jquery"),
		view = require('@base/view');

	var Menu = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {
				// 'class': 'P-site'
			});

			this.Super('init', arguments);
		},
		afterBuild: function(){
			var list = [];
			var html = [];
			var user = pubjs.getUser();

			// 没有用户权限信息，是创建不了完整菜单列表的
			if (!user || (!user.right && user.current && user.current.userId !== -1)){
				return this;
			}

			var rightsMapping = pubjs.config('rightsMapping');
			var rights = user.right || null;

			// var channelLink = this.$channelLink;

			var c = this.getConfig();

			util.each(c.items, function(block, idx){
				var blockItems = [];
				var zone =['<div class="G-frameBodyMenuBlock" data-id="'+idx+'">'];
				util.each(block, function(group){
					// 菜单项目过滤
					var items = [];
					util.each(group.items, function(item){
						// 如果不是超级用户，且没有权限，不添加
						if (!user.super && item.auth && util.find(rights, rightsMapping[item['auth']]) === null){
							return;
						}
						items.push(item);
					});
					if (items.length <= 0){
						return; // 没有菜单项目
					}
					blockItems = blockItems.concat(items);

					// 分组标题
					zone.push(
						'<div class="G-frameBodyMenuGroup">',
						'<strong clss="nav-'+group.icon+'">',
						util.html(LANG(group.text)),
						'</strong><ul>'
					);
					// 菜单项目
					util.each(items, function(item){
						zone.push(
							'<li data-id="'+list.length+'">',
							'<a href="'+item.link+'" >',
							'<i />',
							util.html(LANG(item.text)),
							'</a></li>'
						);
						list.push(item);
					});
					// 结束分组
					zone.push('</ul></div>');
				});

				if(blockItems.length){
					// channelLink[idx] = blockItems[0].link;
				}

				if (zone.length > 1){
					html.push.apply(html, zone);
					html.push('</div>');
				}
			});

			this.$el.html(html.join(''));

			// // 创建结果滚动条
			// if(!this.get('scroll_menu')){
			// 	this.createAsync('scroll_menu', '@base/common/base.scroller', {
			// 		'target': this.$doms.menuListWrapper,
			// 		'content': this.$doms.menuList,
			// 		'dir': 'V',
			// 		'watch': 300,
			// 		'size': 3
			// 	});
			// }

			this.$menus = list;
			// 更新菜单状态
			return this.updateMenu();
		},
		// 更新左侧菜单激活状态和自动切换显示区域
		updateMenu: function(mod, act){
			var C = pubjs.config;
			var self = this;
			var module = mod || C('router/current_module');
			var action = act || C('router/current_action');
			var menu = self.$el;

			if (module && action){
				var index = -1, level = 0;
				util.each(self.$menus, function(item, idx){
					var arr = item.link.split(/[#\/]+/, 3);
					if (arr[1] == module || arr.slice(1, 3).join('/') == module){
						if (level < 2){
							level = 2;
							index = idx;
						}
						if (arr[2] && arr[2] == action){
							level = 3;
							index = idx;
							return false;
						}
					}else if (level === 0 && item.def){
						level = 1;
						index = idx;
					}
				});
				if (index != -1){
					menu.find('li.act').removeClass('act');
					menu = menu.find('li[data-id='+index+']').addClass('act')
						.closest('div.G-frameBodyMenuBlock').show();

					menu.siblings().hide();

					// 获取菜单分组ID
					index = menu.attr('data-id');
				}

			}
			// 更新高度
			// this.syncHeight();

			return self;
		}
	});
	exports.base = Menu;


});