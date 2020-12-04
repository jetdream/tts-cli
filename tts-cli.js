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

async function processFile(inputFile, outputFile) {
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

async function start() {
    let args = process.argv.slice(2);
    if (!args.length || args.length > 2) {
        console.log("File use: tts-cli <inputfile.txt|ssml> [<output.mp3>]");
        console.log("If second parameter is omitted, output file will be with the same name, but with mp3 extension.");
        console.log();
        console.log("Directory use: tts-cli <directory>");
        console.log("Directory must contain txt and/or ssml files.");
        console.log("If according mp3 file does not exists or dates are different, audio will be (re)generated.");
        return;
    }

    let inputFile = args[0];

    let fsStat = util.promisify(fs.stat);

    let inputFileStats = await fsStat(inputFile);

    if (inputFileStats.isDirectory()) {
        let inputDir = inputFile;

        let stat = {};
        let statFile = inputDir+"/tts-cli-processed.json";
        if (fs.existsSync(statFile)) {
            try {
                stat = JSON.parse(fs.readFileSync(statFile, 'UTF8'));
            } catch (e) {
                console.error(e);
            }
        }

        const files = await fs.promises.readdir(inputDir);
        for (const file of files) {
            if (!/\.(txt|ssml)$/i.test(file)) continue;
            let iFile = inputDir+"/"+file;
            let oFile = iFile+".mp3";


            if (fs.existsSync(oFile)) {
                let inputFileStat = await fs.promises.stat(iFile);

                let mtime = +inputFileStat.mtime;
                if (mtime === stat[file]) {
                    console.log("Skipped: "+file);
                    continue;
                } else {
                    stat[file] = mtime;
                }
            }

            await processFile(iFile, oFile);

        }

        let statSerialized = JSON.stringify(stat, null,2);
        fs.writeFileSync(statFile, statSerialized);

        console.log("Done");


    } else {

        if (!/\.(txt|ssml)$/i.test(inputFile)) {
            console.log("Use: tts-cli <inputfile.txt|ssml> [<output.mp3>]");
            console.error("Input file must have txt or ssml extension.");
            return;
        }

        let outputFile = args.length === 2 ? args[1] : inputFile.replace(/\.(txt|ssml)$/i, '.mp3');


        console.log(inputFile, outputFile);

        await processFile(inputFile, outputFile);
    }

}


start();



