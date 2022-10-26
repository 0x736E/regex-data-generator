# regex-data-generator

generate dummy data from regular expressions for testing

## Add configuration

Add configuration file to ./config/schema/patterns.js

## Install dependencies

```console
npm install
```

## Generate data files

There are a number of configuration options:

```console
npm run generate -- --help

usage: generate [options]
  --help          : this message
  --inputFile     : input file containing regex patterns (javascript)
  --selector      : select a specific pattern, by name
  --index         : select a specific pattern, by Index
  --count         : number of samples to generate
  --format        : specify output format (JSON, TEXT)
  --outputDir     : specify an output directory
  --separateFiles : output each generated sample to their own file
  --silent        : silence console output
```

### Example usage
generate 10 random samples for each pattern specified in the ./config/schema/patterns.js file

```console
npm run generate -- --outputDir="./data/" --count=10 --separateFiles
```
