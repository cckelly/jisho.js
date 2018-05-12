'use strict'

const debug = require('debug')('jisho')
const request = require('request')
const fs = require('fs')
const path = require('path')
const { JSDOM } = require('jsdom')

const kJishoUrl = 'https://jisho.org/search/'
const kSearchApiUrl = 'https://jisho.org/api/v1/search/words?keyword='
const kMp3Type = 'mp3'
const kOggType = 'ogg'
const kHttpPrefix = 'http:'

module.exports = {

  async search(keyword = '', getAudioUrl = false) {
    if (!keyword) {
      return new Error('Search requires a keyword.')
    }
    if ('string' != typeof keyword) {
      return new Error('Search requires a keyword of type string.')
    }
    
    const query = kSearchApiUrl + keyword

    return await new Promise((resolve, reject) => {
      request(query, async (err, res, body) => {
        if (err) {
          reject(err)
        } else {
          const { data } = JSON.parse(body)
          if (getAudioUrl) {
            await this._mapAudioUrls(keyword, data)
          }
          resolve(data)
        }
      })
    })
  },

  async _mapAudioUrls(keyword, data = {}) {

    let dom
    try {
      dom = await this._getJishoDocument(keyword)
    } catch (err) {
      console.error(err.stack || err)
    }

    const doc = dom.window.document
    const audioElements = doc.querySelectorAll('audio')

    for (let elem of audioElements) {
      const underscoreIndex = elem.id.lastIndexOf('_')
      const colonIndex = elem.id.lastIndexOf(':')
      const id = elem.id.substring(underscoreIndex + 1, colonIndex)

      const entry = data.find((i) => i.japanese.find((j) => id == j.word))
      entry.mp3Url = this._getAudioSourceByType(elem, kMp3Type)
      entry.oggUrl = this._getAudioSourceByType(elem, kOggType)
    }
  },

  async _getJishoDocument(keyword = '') {
    const query = kJishoUrl + keyword
    return await new Promise((resolve, reject) => {
      request(query, (err, res, body) => {
        if (err) {
          reject(err)
        } else {
          resolve(new JSDOM(body))
        }
      })
    })
  },

  // TODO(cckelly) allow for fully qualified path in outputPath
  // TODO(cckelly) sort through audio returned
  // TODO(cckelly) metadata about files saved to cb
  async getAudio({
    keyword = '', 
    types = [], 
    outputPath = '', 
    filename = ''
    }, cb) {

    return await new Promise((resolve, reject) => {

      if (!keyword) {
        reject(new Error('Keyword not provided.'))
      }

      const query = kJishoUrl + keyword
      if (!Array.isArray(types)) {
        reject(new TypeError('Types must be an array.'))
      }

      const getMp3Source = 0 <= types.indexOf(kMp3Type)
      const getOggSource = 0 <= types.indexOf(kOggType)

      if (!getMp3Source && !getOggSource) {
        reject(new Error('No valid source type provided.'))
      }

      request(query, async (err, res, body) => {
        if (err) {
          reject(err)
        } else {
          
          let dom
          try {
            dom = await this._getJishoDocument(keyword)
          } catch (err) {
            reject(err)
          }

          const name = filename || keyword
          console.log('dom', dom)
          if (getMp3Source) {
            const source = this._getAudioSourceByType(dom, kMp3Type)
            await this._downloadAudio(source, outputPath, name, kMp3Type)
            console.log('downloaded', source, 'to', outputPath)
          }
          if (getOggSource) {
            const source = this._getAudioSourceByType(dom, kOggType)
            this._downloadAudio(source, outputPath, name, kOggType)
          }

          resolve('Audio successfully downloaded')
        }
      })
    })
  },

  async _downloadAudio(srcUrl, outputPath, filename, type) {
    let fullPath = this._resolveFullPath(outputPath, filename)
    fullPath += '.' + type
    await request(srcUrl).pipe(fs.createWriteStream(fullPath))
  },

  _resolveFullPath(outputPath, filename) {
    return path.join(outputPath, filename)
  },

  _getAudioSourceByType(elem, type) {
    let src = null
    if (kMp3Type === type) {
      src = elem.querySelector('audio > source[type=\'audio/mpeg\']').src
    } else if (kOggType === type) {
      src = elem.querySelector('audio > source[type=\'audio/ogg\']').src
    }

    if (src && !src.startsWith(kHttpPrefix)) {
      src = kHttpPrefix + src
    }

    return src
  }

}