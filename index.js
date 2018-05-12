'use strict'

Object.assign(exports, require('./jisho.js'))

const jisho = require('./jisho.js')

async function main() {

  let result
  try {
    result = await jisho.search('みんぞく')
    console.log(result)
  } catch (err) {
    console.log(err)
  }

  // let result 
  // try {
  //   result = await jisho.getAudio({
  //     keyword: 'people',
  //     types: ['mp3']
  //   })
  //   console.log(result)
  // } catch (err) {
  //   console.log('err', err)
  // }

}

main()


