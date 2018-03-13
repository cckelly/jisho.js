'use strict'

const { search, getAudio } = require('./jisho')
const program = require('commander')

program
  .option('-s, --search [keyword]')
  .parse(process.argv)

if (program.search) {
  if ('string' != typeof program.search) {
    console.error('Search keyword must be provided')
    return 
  }
  search(program.search, (err, res) => console.log(err || res))
}

// TODO CLI for audio


