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

  /**
   * Wrapper for Jisho API, including audio download URLs
   * @param  {String}  keyword     Keyword to search for
   * @param  {Boolean} getAudioUrl Should audio URL be included in result
   * @return {Promise}             
   */
  async search(keyword = '', getAudioUrl = false) {
    if (!keyword) {
      return new Error('Search requires a keyword.')
    }
    if ('string' != typeof keyword) {
      return new Error('Search requires a keyword of type string.')
    }
    
    let query = kSearchApiUrl + keyword
    query = encodeURI(query)

    return await new Promise((resolve, reject) => {
      request(query, async (err, res, body) => {
        if (err) {
          reject(err)
        } else {
          const { data } = JSON.parse(body)
          if (getAudioUrl) {
            await this._mapAudioUrls(body, data)
          }
          resolve(data)
        }
      })
    })
  },

  /**
   * Downloads mp3 and ogg audio from Jisho
   * @param  {String}   options.keyword    Keyword to get audio for
   * @param  {Array}    options.types      Audio types to download
   * @param  {String}   options.outputPath Location to download audio files
   * @param  {String}   options.filename   Name of audio files
   * @return {Promise}                     
   */
  async getAudio({
    keyword = '', 
    types = [], 
    outputPath = '', 
    filename = ''
    }) {

    return await new Promise((resolve, reject) => {

      if (!keyword) {
        reject(new Error('Keyword not provided.'))
      }

      const query = encodeURI(kJishoUrl + keyword)
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

          let doc
          try {
            const dom = await this._getJishoDocument(body)
            doc = dom.window.document
          } catch (err) {
            reject(err)
          }

          let id = 'audio_' + keyword + ':'
          const audioElement = doc.querySelector('[id^="' + id + '"]')
          if (!audioElement) {
            reject(new Error('No matching audio element for keyword', keyword))
          }

          let source
          const name = filename || keyword

          // mp3 download
          if (getMp3Source) {
            source = this._getAudioSourceByType(audioElement, kMp3Type)
            if (source) {
              const path = this._resolveOutputPath(outputPath, name, kMp3Type)
              await this._downloadAudio(source, path)
              console.log('Downloaded', name, 'to', path)
            }
          }

          // ogg download
          if (getOggSource) {
            source = this._getAudioSourceByType(audioElement, kOggType)
            if (source) {
              const path = this._resolveOutputPath(outputPath, name, kOggType)
              await this._downloadAudio(source, path)
              console.log('Downloaded', name, 'to', path)
            }
          }

          resolve('Audio successfully downloaded')
        }
      })
    })
  },

  async _downloadAudio(srcUrl, fullPath) {
    await request(srcUrl).pipe(fs.createWriteStream(fullPath))
  },

  _resolveOutputPath(outputPath, filename, type) {
    let fullPath = this._resolveFullPath(outputPath, filename)
    fullPath += '.' + type
    return fullPath
  },

  _resolveFullPath(outputPath, filename) {
    return path.join(outputPath, filename)
  },

  _getJishoDocument(body) {
    return new JSDOM(body)
  },

  _getAudioSourceByType(elem, type) {
    let src, e
    if (kMp3Type === type) {
      e = elem.querySelector('audio > source[type=\'audio/mpeg\']')
    } else if (kOggType === type) {
      e = elem.querySelector('audio > source[type=\'audio/ogg\']')
    }
    src = e && e.src ? e.src : null

    if (src && !src.startsWith(kHttpPrefix)) {
      src = kHttpPrefix + src
    }

    return src
  },

  async _mapAudioUrls(body, data = {}) {

    let dom
    try {
      dom = await this._getJishoDocument(body)
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

}