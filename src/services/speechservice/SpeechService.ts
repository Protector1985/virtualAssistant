import { Readable } from 'stream';
import fetch from 'node-fetch';
import Promptservice from '../prompts/PromptService';


class SpeechService extends Promptservice {
    public phone:any
    public openai:any 
    constructor() {
      super();
      
    }

    async generateSpeech(text: String, targetNumber:string): Promise<string> {
        // const elevenModel = clientData[targetNumber].Model ? "eleven_turbo_v2" : "eleven_multilingual_v1"
        const apiKey = process.env.ELEVEN_LABS_API_KEY;
        
        if (!apiKey) {
          throw new Error('API key is undefined');
        }
        const url = `https://api.elevenlabs.io/v1/text-to-speech/D48E1vZ0gNxxkdaRLcHa/stream?optimize_streaming_latency=2`;
      
        const headers = {
          'accept': 'audio/mpeg',
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        };
      
        const body = JSON.stringify({
          "text": text,
         "model_id": "eleven_turbo_v2",
          "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5,
            "style": 0.4,   
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
    
}

export default SpeechService