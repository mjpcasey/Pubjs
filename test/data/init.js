(function(Sea, Win, Doc){
	// 基本目录配置
	var pubjs = '/pubjs/';
	var path = Win.location.pathname;
	var root = path;
	var app, controller, jQuery, util, platform;

	// 获取并切换模块容器
	var _lastLayoutName = null;
	function getContainer(config){
		if (util.isString(config)){
			config = util.parse(config);
		}
		var c = util.extend({
			scenes: 'main',
			title: false,
			crumbs: false,
			sitelist: true,
			setup_btn: true,
			module: app.config('router/current_module'),
			action: app.config('router/current_action'),
			menu: '',
			full: false
		}, config);

		var menu = c.menu.split('/');
		platform
			.switchScenes(c.scenes)		// 更新场景
			.toggleMenu(!c.full)		// 更新左侧菜单显示状态
			.setTitle(c.title)			// 更新标题
			.setCrumbs(c.crumbs)		// 更新面包屑
			.update(menu[0] || c.module, menu[1] || c.action)	// 更新菜单状态
			.toggleSiteList(c.sitelist)	// 更新网站下拉列表状态
			.toggleSetupButton(c.setup_btn) // 网站设置切换按钮

		if (_lastLayoutName){
			var cont = platform.getContainer(_lastLayoutName, 0, 1);
			if (cont){
				cont.hide();
			}
		}
		_lastLayoutName = c.module + '/' + c.action;
		return platform.getContainer(_lastLayoutName, c.scenes).show();
	}
	function getPlatformDom(name){
		if (platform){
			return platform.getDOM(name);
		}else {
			return null;
		}
	}
	function gotoSite(site_id, uri){
		Win.location.href = '/sitevs/' + site_id + '/#' + uri;
	}

	// 项目根目录修正
	function ROOT(path){
		if (root && path.charAt(0) != '/'){
			return root + path;
		}
		return path;
	}

	// 框架根目录修正
	function PUBJS(path){
		if (path.charAt(0) != '/'){
			return pubjs + path;
		}
		return path;
	}

	Win.ROOT = ROOT;
	Win._T = function(text){ return text; }


	// 返回SeaJS配置信息
	function sea_config(){
		return {
			base: ROOT("project/"),
			alias: {
				// 全局初始配置
				"sys_config":	ROOT("data/config.js"),

				// 基本模块缩写
				"pubjs":		"@core/pub.js",
				"util":			"@core/util.js",
				"@controller":	"@plugins/controller.js",
				"@tpl":			"@plugins/template.js",
				"jquery":		"@libs/jquery/jquery-1.8.3.min.js"
			},
			paths: {
				// 目录缩写
				"@core":		PUBJS("core"),
				"@base":		PUBJS("base"),
				"@libs":		PUBJS("libs"),
				"@plugins":		PUBJS("plugins")
			},
			debug: 0
		};
	}

	// 分部初始化函数
	function INIT_PROCESS(){
		var cb = INIT_STEPS[INIT_STAGE++];
		if (cb){
			cb.apply(Win, arguments);
		}
	}
	var INIT_STAGE = 0;
	var INIT_STEPS = [
		// 修正页面路径
		function(){
			if (root.slice(-1) !== '/'){
				root = root.substr(0, root.lastIndexOf('/') + 1);
			}
			var node = Doc.getElementsByTagName('base');
			if (node.length){
				root = node[0].getAttribute('href');
				node[0].setAttribute('href', path);
			}
			//TODO: 暂时把pubjs部署在项目目录下
			pubjs = ROOT('../source/');

			// SeaJS全局配置
			Sea.config(sea_config());

			// 引入模块, 开始初始化
			Sea.use(['pubjs', 'sys_config', 'jquery', 'util'], INIT_PROCESS);
		},

		// 加载pubjs和系统全局配置
		function(pubjs, config, JQUERY, UTIL){
			app = pubjs;
			jQuery = JQUERY;
			util = UTIL;
			app.getContainer = getContainer;
			app.getPlatformDom = getPlatformDom;
			app.go = gotoSite;

			app.init(config);

			// 加载用户及控制器等插件模块
			app.use([
				'@plugins/controller',
				'@plugins/i18n',
				'@plugins/model',
				'@plugins/user',
				'@plugins/alert',
				'@plugins/codecopy',
				'@plugins/storage',
				'@plugins/mc'
			]);
			// ], INIT_PROCESS);
		},

		// 系统模块初始化完成, 创建全局框架
		function(){
			app.setUser(app.config('user_data'));
			app.core.createAsync(
				'SYS_PLATFORM',
				'layout/platform.main',
				INIT_PROCESS
			);
		},

		// 配置完成, 启动应用
		function(PLATFORM){
			app.platform = platform = PLATFORM;
			app.DEFAULT_POPUP_CONTAINER = platform.getDOM('popup');
			// 移除初始加载界面
			jQuery('body').removeClass('appLoading');
			jQuery('.loadingBox, noscript').remove();
			// 启动路由
			controller.start();
			app.log('PubJS App BOOTED!!');
		}
	];

	// 初始化应用对象
	INIT_PROCESS();

})(seajs, window, document);
