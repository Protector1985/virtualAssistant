import { Readable } from 'stream';
import fetch from 'node-fetch';
import Promptservice from '../prompts/PromptService';
import { clientData } from '../../clientData';
import OpenAI from "openai";

class SpeechService extends Promptservice {
    public phone:any
    public openai:any 
    constructor() {
      super();
      
    }

    async generateSpeech(text: String, targetNumber:string): Promise<string> {
        // const elevenModel = clientData[targetNumber].turboModel ? "eleven_turbo_v2" : "eleven_multilingual_v1"
        const apiKey = process.env.ELEVEN_LABS_API_KEY;
        
        if (!apiKey) {
          throw new Error('API key is undefined');
        }
        const url = `https://api.elevenlabs.io/v1/text-to-speech/D48E1vZ0gNxxkdaRLcHa/stream`;
      
        const headers = {
          'accept': 'audio/mpeg',
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        };
      
        const body = JSON.stringify({
          "text": text,
         "model_id": "eleven_turbo_v2",
          "voice_settings": {
            "stability": 0.4,
            "similarity_boost": 0.5
          }
        });
      
        try {
        const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: body
        });
        
    
        const chunks = [];
        for await (const chunk of response?.body) {
          chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
        }
        
        const audioBuffer = Buffer.concat(chunks);
        const base64Audio = audioBuffer.toString('base64');
        
        return base64Audio;
      } catch(err) {
        console.log(err)
        throw err
       
      }
      }

  //  async generateSpeech(text: string, targetNumber: string): Promise<string> {
  //     try {
  //         // You can add logic here to select different voice models based on 'targetNumber'
  //         // For simplicity, this example uses a fixed model and voice
  //         const model = "tts-1"; // This is an example, replace with the actual model you intend to use
  //         const voice = "alloy"; // This is an example, replace with the actual voice you intend to use
  //         this.openai = new OpenAI()

  //         const mp3 = await this.openai.audio.speech.create({
  //             model: model,
  //             voice: voice,
  //             input: text,
  //         });
  
  //         const buffer = Buffer.from(await mp3.arrayBuffer());
  //         const base64Audio = buffer.toString('base64');
  
  //         return base64Audio;
  //     } catch (err) {
  //         console.log(err);
  //         throw err;
  //     }
  // }

    
    
    
}

export default SpeechService