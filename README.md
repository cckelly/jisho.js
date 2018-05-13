# jisho

Node wrapper module with audio support for the Japanese dictionary jisho.org.

Yes, it's been done before but with no easy way to also extract the audio provided from WaniKani.

## Installation

``` js
npm install jisho.js
```

## API

``` js
const jisho = require('jisho.js')
````

#### `const result = await jisho.search(keyword, getAudioUrl)`

Search using the API.

`keyword`: Keyword to get results for.<br/>
`getAudioUrl`: Should audio download urls be included in results. Defaults to false.

#### `const result = await jisho.getAudio(keyword, types, [outputPath], [fileName])`

Download audio from Jisho. It's good to note that the audio will only be download if there is an exact match of the keyword searched.

`keyword`: Keyword to search.<br/>
`types`: Array of strings that include audio types to download. Can only be `mp3`, `ogg`, or both.<br/>
`outputPath`: Location to download audio files to. Defaults to current working directory if not given.<br/>
`filename`: Name of the downloaded file. Defaults to keyword if not provided.<br/>

## License

MIT
