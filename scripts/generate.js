const { RegexDataGenerator } = require('../lib/index.js');
const colors = require('colors');
const argv = require("process.argv");
const processArgv = argv(process.argv.slice(2));

function validateConfig() {

  let config = processArgv({
    count: 10
  });

  if ( config.help ) {

    let msg = `usage: generate [options]
  --help          : this message
  --inputFile     : input file containing regex patterns (javascript)
  --selector      : select a specific pattern, by name
  --index         : select a specific pattern, by Index
  --count         : number of samples to generate
  --format        : specify output format (JSON, TEXT, XML, YAML)
  --outputDir     : specify an output directory
  --separateFiles : output each generated sample to their own file
  --silent        : silence console output
    `;

    console.log(msg);
    process.exit(0);
  }

  PATTERNS = (config.inputFile ? require(config.inputFile) : require('../config/index.js'));
  var PATTERN_KEYS = Object.keys(PATTERNS);

  if ( config.index !== null ) {

    let index = parseInt(config.index);
    if ( index < 0 || index >= PATTERN_KEYS.length ) {
      console.log('Invalid Selector Index, out of range (0-' + (PATTERN_KEYS.length-1) + ')');
      process.exit(1);
    }
    config.selector = PATTERN_KEYS[index];

  } else if( config.selector != null && config.selector.toUpperCase() == 'ALL' ) {

    config.selector = null;

  } else if( config.selector != null && !PATTERN_KEYS.includes(config.selector) ) {

    console.log('Invalid Selector:', config.selector);

    let matches = [];
    for ( patternKey of PATTERN_KEYS ) {
      if ( patternKey.includes(config.selector) ) {
        matches.push(patternKey);
      }
    }

    if(matches.length > 0) {
      console.log('Did you mean: ', matches);
    }

    process.exit(1);
  }

  return config;
}

function printMessage( options ) {

  if ( options.silent == true ) {
    return null;
  }

  let count = '' + (options.count != null ? options.count : RegexDataGenerator.SampleCount );
  let selector = ('"' + (options.selector == null ? 'All' : options.selector) + '"');
  let format = (options.format ? options.format : 'JSON');
  format = format instanceof Array ? options.format.join(',') : options.format;

  let msg = '';
  msg += 'Generating ' + count.yellow + ' samples of ' + selector.green + ' as ' + format.cyan;

  console.log(msg);
}

let config = validateConfig();
RegexDataGenerator.generateAsFiles(config, PATTERNS, (options) => {

  printMessage(options);

});
