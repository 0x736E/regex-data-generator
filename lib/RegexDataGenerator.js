const fs = require('fs');
const path = require('path');
const RandExp = require('randexp');
const jsonxml = require('jsontoxml');
const yaml = require('json-to-pretty-yaml');


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

  static SampleCount = 10;
  #numSamples = 100;

  constructor(src) {

    this.dataSource = src;

  }

  static generatePatternsWithFormat(targetPatterns, sampleCount, format, callback, selector) {

    return new Promise((resolve, reject) => {

      // optionally supply a key ID for the pattern object
      targetPatterns = this.#getPatternSelection(targetPatterns, selector);

      let data = null;
      let dataGen = null;
      let targetPatternKeys = Object.keys(targetPatterns);
      let outputFormatArray;// = format.toUpperCase();


      if ( format instanceof Array ) {
        outputFormatArray = format;
      } else if ( typeof(format) === "string" ) {
        outputFormatArray = [ format ];
      } else {
        throw new Error("invalid format specified " + format);
      }

      for ( let patternKey of targetPatternKeys ) {
        dataGen = new RegexDataGenerator([ targetPatterns[patternKey] ]);
        data = dataGen.generateFromRegex(sampleCount, (result) => {
          
          outputFormatArray.forEach((outputFormat) => {

            let format = outputFormat.trim().toUpperCase();
            // inefficient for plaintext:
            let obj = {};
            let safePatternKey = patternKey.match(/[a-zA-Z0-9]+/g).join('_')
            obj[safePatternKey] = result.sample;
            switch ( format ) {

              default:
              case null:
              case 'JSON':
                callback(JSON.stringify(obj), format);
                break;

              case 'XML':
                let data = obj[safePatternKey];

                // escape character data
                if ( data.match(/([<>&]|\-\-)/g) ) {
                  data = '<' + safePatternKey + '><![CDATA[' + data + ']]></' + safePatternKey + '>';
                } else {
                  data = '<' + safePatternKey + '>' + data + '</' + safePatternKey + '>';
                }

                callback(data, format);
                break;

              case 'YAML':
                callback(yaml.stringify(obj), format);
                break;

              case 'PLAIN':
              case 'TEXT':
              case 'FLAT':
                callback(result.sample, format);
                break;

            }
          });

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

  static getFileExtForFormat( format ) {

    let ext;
    switch (format.toUpperCase()) {

      case  'XML':
          ext = '.xml';
          break;

      case  'TEXT':
      case  'PLAIN':
      case  'FLAT':
          ext = '.txt';
          break;

      case  'YAML':
          ext = '.yaml';
          break;

      default:
      case  'JSON':
          ext = '.json';
          break;
    }

    return ext;
  }

  static async generateAsFiles ( config, patterns, callback, index ) {

    callback = (callback ? callback : ()=>{});

    let outputAsJSON = false;
    if ( typeof(config.format) === "string" ) {
      outputAsJSON = (config.format && config.format.toUpperCase() === 'JSON') ;
    }

    if ( config.selector == null && config.separateFiles ) {

      let patternKeys = Object.keys(patterns);
      let options = config;
      options.separateFiles = false;

      for ( let key of patternKeys ) {

        options.selector = key;
        callback(options, patterns);

        RegexDataGenerator.generateAsFiles(options, patterns, callback, index );
      }

      return Promise.resolve();

    }

    if ( config.outputDir instanceof Array ) {
      config.outputDir = config.outputDir[config.outputDir.length-1];
    }
    // let filePath = path.resolve(config.outputDir);
    let filePath = path.resolve( config.outputDir, config.selector.match(/[a-zA-Z0-9]+/g).join('_') ) ;
    if (!fs.existsSync(filePath) ) {
      fs.mkdirSync(filePath);
    }

    if ( typeof(config.format) === "string" ) {
      if ( config.format.indexOf(",") ) {
        config.format = config.format.split(",");
      } else {
        config.format = [config.format];
      }
    }

    let selector = config.selector;
    filePath = path.resolve(filePath, (config.selector == null ? 'All' : config.selector));
    if ( config.oneSamplePerFile ) {

      let output;
      let i = 0;
      return RegexDataGenerator.generatePatternsWithFormat(patterns, config.count, config.format, (data, format) => {

        let ext = RegexDataGenerator.getFileExtForFormat(format);
        let fileStream = fs.createWriteStream(filePath + ' ' + (i++) + ext, { flags:'w' });
        fileStream.write(data + "\n");
        fileStream.end();
        fileStream = null;

      }, config.selector, config.format);

    } else {

      // create write stream for each file format
      let writeStreams = {};
      let writeFilePaths = {};
      config.format.forEach( (writeFormat) => {

        writeFormat = writeFormat.toUpperCase();
        let ext = RegexDataGenerator.getFileExtForFormat(writeFormat);
        writeFilePaths[writeFormat] = filePath + ext;
        writeStreams[writeFormat] = fs.createWriteStream(writeFilePaths[writeFormat], { flags:'w' });

        // write header or start of file
        switch (writeFormat) {
          case 'json':
            writeStreams[writeFormat].write("[\n");
            break;

          default:
            break;
        }

      })

      let dataIndex = 0;
      return RegexDataGenerator.generatePatternsWithFormat(patterns, config.count, config.format, (data, format) => {

        // write footer or end of file
        switch (format) {
          case 'json':
            writeStreams[format].write("\t" + data);
            if ( dataIndex++ < config.count-1 ) {
              writeStreams[format].write(",\n");
            } else {
              writeStreams[format].write("\n]");
            }
            break;

          default:
            writeStreams[format].write(data + "\n");
            break;
        }

      }, config.selector, config.format).then(() => {

        // close file streams
        for (let i=0; i<config.format.length; i++) {
          writeStreams[config.format[i].toUpperCase()].end();
        }

        return Promise.resolve();
      });
    }

  }

}

module.exports = RegexDataGenerator;
