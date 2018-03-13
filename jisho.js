'use strict'

const debug = require('debug')('jisho')
const request = require('request')
const fs = require('fs')
const { JSDOM } = require('jsdom')

const kJishoUrl = 'http://jisho.org/search/'
const kSearchApiUrl = 'http://jisho.org/api/v1/search/words?keyword='
const kMp3Type = 'mp3'
const kOggType = 'ogg'
const kHttpPrefix = 'http:'

module.exports = {

  search(keyword, cb) {
    if (!keyword) {
      return new Error('Search requires a keyword')
    }
    if ('string' != typeof keyword) {
      return new Error('Search requires a keyword of type string')
    }
    
    const query = kSearchApiUrl + keyword
    request(query, (err, res, body) => {
      if (err) {
        cb(err)
      } else {
        const { data } = JSON.parse(body)
        cb(null, data)
      }
    })
  },

  getAudio(keyword, outputPath = '', filename = '') {
    const query = kJishoUrl + keyword
    const req = request(query, (err, res, body) => {
      if (err) {
        cb(err)
      } else {
        const { document: doc } = new JSDOM(body).window
        const src = this._getAudioSourceByType(doc, kMp3Type)
        const name = filename || keyword
        request(src).pipe(fs.createWriteStream(name + '.mp3'))
      }
    })
  },

  _getAudioSourceByType(doc, type) {
    let src = null
    if (kMp3Type === type) {
      src = doc.querySelector('audio > source[type=\'audio/mpeg\']').src
    } else if (kOggType === type) {
      src = doc.querySelector('audio > source[type\'audio/ogg\']').src
    }

    if (src && !src.startsWith(kHttpPrefix)) {
      src = kHttpPrefix + src
    }

    return src
  }

}