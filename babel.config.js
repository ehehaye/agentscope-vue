module.exports = {
	presets: ['@vue/cli-plugin-babel/preset'],
	// webpack 4 的 acorn 不支持数值分隔符（10_000），强制转换
	plugins: [
		'@babel/plugin-transform-numeric-separator',
		// '@babel/plugin-proposal-nullish-coalescing-operator',
    // '@babel/plugin-proposal-optional-chaining',
	],
};
