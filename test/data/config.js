/********************
 *	系统全局配置信息
 ********************/
define(function(){
	var win = window;
	var host = win.location.host;
	var ROOT = win.ROOT;

	return {
		// 调试模式
		debug: 2,
		// 默认路由入口
		router: {
			default_module: 'sites',
			default_action: 'main',
			login_module: 'login',
			login_action: 'main',
			publics: ['login', 'privacy']
		},
		login: {
			cookie_expires: 30, // 保存30天
			user_cookie_name: 'bx_user_cookie'
		},
		app: {
			mc: {
				"uri_prefix": "/msg/",
				"prefix": {
					"/": "default://",
					"/dsp/": "dsp://msg/"
				},
				"remotes": {
					"default": {
						"type": "websocket",
						"resource": "dsp_socket",
						"url": "http://localhost:8099"
					},
					"dsp": {
						"type": "websocket",
						"url": "http://localhost:8099"
					},
					"local": {
						"type": "local"
					}
				}
			}
		},
		// 控制器所在目录
		app_base: ROOT('controller/'),
		// 中间件基础目录
		plugin_base: 'plugins/',
		// 模板文件基础路径
		template_base: ROOT('tpl/'),

		// 数据中心参数配置
		data:{
			max_query: 10,
			points: {
				'/i18n': ROOT('i18n/')
			}
		},

		// 多语言配置
		language:{
			'default': 'zhCN',
			'cookie': 'lang',
			'style': ROOT('i18n/')
		},

		// 默认表单分组信息
		default_tab_cols: {
			"default":{
				"text":_T('默认'),
				"cols":[]
			},
			"custom":{
				"text":_T('自定义'),
				"cols":[],
				"custom":true
			}
		}
	};
});