/* eslint-disable import/no-extraneous-dependencies */
import commonjsPlugin from 'rollup-plugin-commonjs';
import typescriptPlugin from 'rollup-plugin-typescript2';
import nodeResolvePlugin from 'rollup-plugin-node-resolve';
/* eslint-enable import/no-extraneous-dependencies */

import { tmpdir } from 'os';
// @ts-ignore
import { builtinModules } from 'module';
import { join as pathJoin } from 'path';

const coreModules = builtinModules.filter(name => (
	!/(^_|\/)/.test(name)
));

export default async () => {
	const workspace = pathJoin(__dirname, 'packages/vk-io');

	const src = pathJoin(workspace, 'src');
	const lib = pathJoin(workspace, 'lib');

	const pkg = await import(pathJoin(workspace, 'package.json'));

	const cacheRoot = pathJoin(tmpdir(), '.rpt2_cache');

	return {
		input: pathJoin(src, 'index.ts'),
		external: [
			...Object.keys(pkg.dependencies || {}),
			...Object.keys(pkg.peerDependencies || {}),
			...coreModules
		],
		plugins: [
			nodeResolvePlugin(),
			commonjsPlugin(),
			typescriptPlugin({
				cacheRoot,

				rollupCommonJSResolveHack: true,
				useTsconfigDeclarationDir: false,

				// declarationDir: lib,

				tsconfigOverride: {
					outDir: lib,
					rootDir: src,
					include: [src]
				}
			})
		],
		output: [
			{
				file: pathJoin(workspace, `${pkg.main}.js`),
				format: 'cjs',
				exports: 'named'
			},
			// {
			// 	file: pathJoin(workspace, `${pkg.main}.mjs`),
			// 	format: 'esm'
			// }
		]
	}
};
