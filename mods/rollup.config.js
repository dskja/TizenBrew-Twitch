import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

export default {
  input: 'userScript.js',
  output: {
    file: 'dist/userScript.js',
    format: 'iife',
    name: 'TizenTwitch'
  },
  plugins: [
    resolve({
      browser: true
    }),
    commonjs(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    babel({
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env']
    }),
    terser()
  ]
};
