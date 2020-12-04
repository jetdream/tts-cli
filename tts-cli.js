// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');
const credentials = require('./keys/tts-cli-service-account.json');

// Import other required libraries
const fs = require('fs');
const util = require('util');
// Creates a client
const client = new textToSpeech.TextToSpeechClient({
  credentials
});

async function quickStart(inputFile, outputFile) {
  // The text to synthesize
    const text = fs.readFileSync(inputFile,'UTF8');

    // SSML: https://cloud.google.com/text-to-speech/docs/ssml

    let input = /\.ssml/i.test(inputFile) ? {ssml: text} : {text};

  // Construct the request
  const request = {
    input,
    voice: {
        languageCode: 'en-US',
        name:"en-US-Wavenet-J"   // other voices: https://cloud.google.com/text-to-speech/docs/voices
    },
    audioConfig: {
        audioEncoding: 'MP3',
        effectsProfileId: ['large-automotive-class-device'],
        speakingRate: 1.1,  // Default 1, possible values: 0.25 - 4.0
        pitch: -3, // Default: 0, possible values: -20.0 - 20.0
        volumeGainDb: 0, // -96 - 16
        //sampleRateHertz: 32000,
    },
  };

  // Performs the text-to-speech request
  const [response] = await client.synthesizeSpeech(request);
  // Write the binary audio content to a local file
  const writeFile = util.promisify(fs.writeFile);
  await writeFile(outputFile, response.audioContent, 'binary');
  console.log('Audio content written to file: '+outputFile);
}

let args = process.argv.slice(2);
if (!args.length || args.length > 2) {
    console.log("Use: tts-cli <inputfile.txt|ssml> [<output.mp3>]");
    console.log("If second parameter is omitted, output file will be with the same name, but with mp3 extension.");
    return;
}

let inputFile = args[0];

if (!/\.(txt|ssml)$/i.test(inputFile)) {
    console.log("Use: tts-cli <inputfile.txt|ssml> [<output.mp3>]");
    console.error("Input file must have txt or ssml extension.");
    return;
}

let outputFile = args.length === 2 ? args[1] : inputFile.replace(/\.(txt|ssml)$/i,'.mp3');


console.log(inputFile, outputFile);

quickStart(inputFile, outputFile);




