'use strict'
require('./check-versions')()

process.env.NODE_ENV = 'production'

const ora = require('ora')
const del = require('del')
const rm = require('rimraf')
const path = require('path')
const chalk = require('chalk')
const webpack = require('webpack')
const packager = require('electron-packager')
const { rebuild } = require('electron-rebuild')
const Multispinner = require('multispinner')
const config = require('../config')
const webpackConfig = require('./webpack.prod.conf')
const mainConfig = require('./webpack.main.conf')

const doneLog = chalk.bgGreen.white(' DONE ') + ' '
const errorLog = chalk.bgRed.white(' ERROR ') + ' '
const okayLog = chalk.bgBlue.white(' OKAY ') + ' '

if (process.env.BUILD_TARGET === 'clean') clean()
else build()

function clean () {
  rm(config.build.assetsRoot, err => {
    if (err) throw err
    console.log('rm dist/ done...')
  })
  process.exit()
}

function build () {
  /*
  const spinner = ora('building for production...')
  spinner.start()

  rm(path.join(config.build.assetsRoot, config.build.assetsSubDirectory), err => {
    if (err) throw err
    webpack(webpackConfig, (err, stats) => {
      spinner.stop()
      if (err) throw err
      process.stdout.write(stats.toString({
        colors: true,
        modules: false,
        children: false, // If you are using ts-loader, setting this to true will make TypeScript errors show up during build.
        chunks: false,
        chunkModules: false
      }) + '\n\n')

      if (stats.hasErrors()) {
        console.log(chalk.red('  Build failed with errors.\n'))
        process.exit(1)
      }

      console.log(chalk.cyan('  Build complete.\n'))
      console.log(chalk.yellow(
        '  Tip: built files are meant to be served over an HTTP server.\n' +
        '  Opening index.html over file:// won\'t work.\n'
      ))
    })
  })
  */

  const tasks = ['main', 'renderer']
  const m = new Multispinner(tasks, {
    preText: 'building',
    postText: 'process'
  })

  let results = ''

  m.on('success', () => {
    process.stdout.write('\x1B[2J\x1B[0f]]')
    console.log(`\n\n${results}`)
    bundleApp()
  })

  pack(mainConfig).then(result => {
    results += result + '\n\n'
    m.success('main')
  }).catch(err => {
    m.error('main')
    console.log(`\n  ${errorLog}failed to build main process`)
    console.error(`\n${err}\n`)
    process.exit(1)
  })

  pack(webpackConfig).then(result => {
    results += result + '\n\n'
    m.success('renderer')
  }).catch(err => {
    m.error('renderer')
    console.log(`\n  ${errorLog}failed to build renderer process`)
    console.error(`\n${err}\n`)
    process.exit(1)
  })
}

function pack (config) {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) reject(err.stack || err)
      else if (stats.hasErrors()) {
        let err = ''

        stats.toString({
          chunks: false,
          colors: true
        })
        .split(/\r?\n/)
        .forEach(line => {
          err += `    ${line}\n`
        })

        reject(err)
      } else {
        resolve(stats.toString({
          chunks: false,
          colors:true
        }))
      }
    })
  })
}

function bundleApp () {
  packager({
    arch: 'x64',
    asar: false,
    dir: path.join(__dirname, '../'),
    icon: path.join(__dirname, '../build/logo.png'),
    ignore: /(^\/(src|test|\.[a-z]+|README|yarn|static\/web))|\.gitkeep/,
    out: path.join(__dirname, '../dist'),
    overwrite: true,
    platform: process.env.BUILD_TARGET || 'all',
      /*
    afterCopy: [(buildPath, electronVersion, platform, arch, callback) => {
      rebuild({ buildPath, electronVersion, arch })
        .then(() => callback())
        .catch((err) => callback(err))
    }]*/
  }).then(() => {
    console.log(`\n${doneLog}\n`)
  }).catch((err) => {
    console.log(`\n${errorLog}${chalk.yellow('`electron-packager`')} says...\n`)
    console.log(err + '\n')
  })
}
