define(function(require,exports){
	var pubjs = require("pubjs");
	//var $ = require("jquery");
	var util = require('util');
	var view = require('@base/view');

	// 切换报表与后台控件
	var AdminSwitch = view.container.extend({
		init: function(config){
			config = pubjs.conf(config, {

			});

			this.Super('init', arguments);
		},
		afterBuild: function(){
			var self = this;
			var c = self.getConfig();
			var el = self.getDOM();
			var adminList = [];
			var html_start = '';
			var html_end = '';

			util.each(c.items, function(item, idx){
				if(item){
					adminList.push(
						'<li data-id="'+idx+'" class="'+item.class+'" data-type="'+item.class+'">',
							'<a href="'+item.link+'">',
								util.html(LANG(item.text)),
								'<i class="'+item.icon+'" />',
							'</a>',
						'</li>'
					);
					html_start = '<ul>';
					html_end = '</ul>';
				}
			});

			el.html( html_start+adminList.join('')+html_end );

			return this.updateChannel();
		},
		// 更新大渠道激活状态
		updateChannel: function(mod, act){
			var c = pubjs.config;
			var self = this;
			var module = mod || c('router/current_module');
			var action = act || c('router/current_action');

			if (module && action){
				var index = -1;
				util.each(c.items, function(item, idx){
					var arr = item.link.split(/[#\/]+/, 3);
					if (arr[1] == module && (!arr[2] || arr[2] == action)){
						index = idx;
						return false;
					}
					if (item.def){
						index = idx;
					}

				});
				if (index != -1){
					self.$doms.channel.find('li[data-id='+index+']')
						.addClass('act')
						.siblings().removeClass('act');
					self.updateAdminSwitch(module);
				}
			}

			return self;
		},
		// 更新管理后台切换样式
		updateAdminSwitch: function(module){
			var bool = module.indexOf('admin/') === 0;
			var el = this.getDOM();
			el.find('ul').toggleClass('act', bool)
				.find('li').addClass('act')
				.filter('li[data-type="admin"]').toggleClass('act', bool)
				.siblings().toggleClass('act',!bool);
		}
	});
	exports.base = AdminSwitch;
});