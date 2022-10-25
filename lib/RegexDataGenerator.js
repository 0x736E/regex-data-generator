const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const RandExp = require('randexp');


class RegexDataGenerator {

  #debug = true;
  static defaultFormat = 'JSON';

  /*
      from randexp README:
      Repetitional tokens such as *, +, and {3,} have an infinite max range.
      In this case, randexp looks at its min and adds 100 to it to get a useable
      max value. If you want to use another int other than 100 you can change
      the max property in RandExp.prototype or the RandExp instance.
  */
  regexConfig = {
    min: 1,
    max: 100
  };

  #patterns = [];
  #patternIDs = [];
  #xegerPatterns = [];

  static SampleCount = 100;
  #numSamples = 100;

  constructor(src) {

    this.dataSource = src;

  }

  cleanup() {
    //TODO
  }

  static generatePattern(targetPatterns, sampleCount, callback, selector, format) {

    let self = this;
    return new Promise((resolve, reject) => {

      format = (format == null ? RegexDataGenerator.defaultFormat : format);

      switch ( format.toUpperCase() ) {

        default:
        case null:
        case 'JSON':
          return self.#generatePatternsAsJSON(targetPatterns, sampleCount, callback, selector);
          break;

        case 'PLAIN':
        case 'TEXT':
        case 'FLAT':
          return self.#generatePatternsAsFlatData(targetPatterns, sampleCount, callback, selector);
          break;

      }

      return reject( new Error('unknown error occurred') );

    });

  }

  static #generatePatternsAsFlatData(targetPatterns, sampleCount, callback, selector) {

    return new Promise((resolve, reject) => {

      // optionally supply a key ID for the pattern object
      targetPatterns = this.#getPatternSelection(targetPatterns, selector);

      let data = null;
      let dataGen = null;
      let targetPatternKeys = Object.keys(targetPatterns);

      for ( let id of targetPatternKeys ) {
        dataGen = new RegexDataGenerator([ targetPatterns[id] ]);
        data = dataGen.generateFromRegex(sampleCount, (result) => {
          callback(result.sample);
        });
      }

      return resolve(data);
    });

  }

  static #getPatternSelection (targetPatterns, selector) {

    let patternSelection = targetPatterns;
    if(selector) {
      patternSelection = {}
      patternSelection[selector] = targetPatterns[selector];
    }

    return patternSelection;
  }

  static #generatePatternsAsJSON(targetPatterns, sampleCount, callback, selector) {

    return new Promise((resolve, reject) => {

      // optionally supply a key ID for the pattern object
      targetPatterns = this.#getPatternSelection(targetPatterns, selector);

      let data = null;
      let targetPatternKeys = Object.keys(targetPatterns);
      let dataGen = null;
      let patternIndex = 0;
      let sampleIndex = 0;

      callback('{');
      for ( let id of targetPatternKeys ) {
        callback('  "' + id + '": [')
        dataGen = new RegexDataGenerator([ targetPatterns[id] ]);
        sampleIndex = 0;
        data = dataGen.generateFromRegex(sampleCount, (result) => {
          if( ++sampleIndex < sampleCount ) {
            callback("    " + JSON.stringify(result.sample) + ",");
          } else {
            callback("    " + JSON.stringify(result.sample));
          }
        });
        if ( ++patternIndex < targetPatternKeys.length ) {
          callback('  ],');
        } else {
          callback('  ]');
        }
      }
      callback('}');

      return resolve();
    });

  }

  async generateFromRegex(numSamples, callback) {

    numSamples = (numSamples ? numSamples : this.#numSamples);
    callback = (callback ? callback : ()=>{} );

    let out = [];
    let sample = null;
    for ( let id of this.#patternIDs ) {

      out[id] = [];
      for ( let j = 0; j < numSamples; j++ ) {

        sample = this.#xegerPatterns[id].gen();
        out[id].push(sample);

        callback({
          pattern: id,
          sample: sample
        });

      }

    }
    return out;

  }

  set dataSource(src) {

    if(!src) {
      this.#patterns = null;
      this.#patternIDs = null;
      return;
    }

    this.#patterns = src;
    this.#patternIDs = Object.keys(src);

    let xeger = null;
    for ( let id of this.#patternIDs ) {
      xeger = new RandExp(this.#patterns[id]);
      xeger.max = Math.floor(Math.random() * (this.regexConfig.max-this.regexConfig.min))+this.regexConfig.min;
      this.#xegerPatterns[id] = xeger;
    }

  }

  static async generateAsFiles ( config, patterns, callback ) {

    callback = (callback ? callback : ()=>{});

    if ( config.selector == null && config.separateFiles ) {

      let patternKeys = Object.keys(patterns);
      let options = config;
      options.separateFiles = false;

      for ( let key of patternKeys ) {

        options.selector = key;
        callback(options, patterns);

        RegexDataGenerator.generateAsFiles(options, patterns);
      }

      return Promise.resolve();

    }

    let fileStream;

    let ext = '.json';
    if ( config.format && config.format.toUpperCase() !== 'JSON' ) {
      ext = '.txt'
    }

    let filePath = path.resolve(config.outputDir);
    if (!fs.existsSync(filePath) ) {
      fs.mkdirSync(filePath);
    }

    filePath = path.resolve(filePath, (config.selector == null ? 'All' : config.selector)  + ext);
    fileStream = fs.createWriteStream(filePath, { flags:'w' });

    let selector = config.selector;

    return RegexDataGenerator.generatePattern(patterns, config.count, (data) => {

      fileStream.write(data + "\n");

    }, config.selector, config.format).then(() => {

      fileStream.end();

      return Promise.resolve();
    });

  }

}

module.exports = RegexDataGenerator;
