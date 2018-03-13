'use strict'

const debug = require('debug')('jisho')
const request = require('request')
const fs = require('fs')
const path = require('path')
const { JSDOM } = require('jsdom')

const kJishoUrl = 'http://jisho.org/search/'
const kSearchApiUrl = 'http://jisho.org/api/v1/search/words?keyword='
const kMp3Type = 'mp3'
const kOggType = 'ogg'
const kHttpPrefix = 'http:'

module.exports = {

  search(keyword, cb) {
    if (!keyword) {
      return new Error('Search requires a keyword.')
    }
    if ('string' != typeof keyword) {
      return new Error('Search requires a keyword of type string.')
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

  // TODO(cckelly) allow for fully qualified path in outputPath
  // TODO(cckelly) validate input
  getAudio({
    keyword = '', 
    types = [], 
    outputPath = '', 
    filename = ''
    }, cb) {

    const query = kJishoUrl + keyword

    if (!Array.isArray(types)) {
      cb(new Error('Types must be an array.'))
      return
    }

    const getMp3Source = 0 <= types.indexOf(kMp3Type)
    const getOggSource = 0 <= types.indexOf(kOggType)

    if (!getMp3Source && !getOggSource) {
      cb(new Error('No valid source type provided.'))
      return
    }

    const req = request(query, (err, res, body) => {
      if (err) {
        cb(err)
      } else {
        const { document: doc } = new JSDOM(body).window

        const name = filename || keyword
        if (getMp3Source) {
          const source = this._getAudioSourceByType(doc, kMp3Type)
          this._downloadAudio(source, outputPath, name, kMp3Type)
        }
        if (getOggSource) {
          const source = this._getAudioSourceByType(doc, kOggType)
          this._downloadAudio(source, outputPath, name, kOggType)
        }

        // TODO(cckelly) throw cb once audio files are done downloading
        // TODO(cckelly) metadata about files saved to cb
        cb(null, 'Audio successfully downloaded')
      }
    })
  },

  _downloadAudio(srcUrl, outputPath, filename, type) {
    let fullPath = this._resolveFullPath(outputPath, filename)
    fullPath += '.' + type
    request(srcUrl).pipe(fs.createWriteStream(fullPath))
  },

  _resolveFullPath(outputPath, filename) {
    return path.join(outputPath, filename)
  },

  _getAudioSourceByType(doc, type) {
    let src = null
    if (kMp3Type === type) {
      src = doc.querySelector('audio > source[type=\'audio/mpeg\']').src
    } else if (kOggType === type) {
      src = doc.querySelector('audio > source[type=\'audio/ogg\']').src
    }

    if (src && !src.startsWith(kHttpPrefix)) {
      src = kHttpPrefix + src
    }

    return src
  }

}