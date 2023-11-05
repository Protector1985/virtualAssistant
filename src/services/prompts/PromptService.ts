
import OpenAI from "openai";
import PhoneService from "../phoneCalls/PhoneService";
const voice: any = require('elevenlabs-node');

class Promptservice extends PhoneService {
    
    public openai:any
    constructor() {
        super();
        
    }
    async mainModelPrompt(prompt:string) {
        
        try {
            //defined the api key so that it will be picked up automatically
            
                const convo = await this.openai.chat.completions.create({
                  model: 'gpt-3.5-turbo',
                  max_tokens: 50,
                  temperature: 0.1,
                  messages: [
                    { role: 'user', content: prompt + "Give me a short response with 50 tokens max."},

                ],
                });
            
            
            return convo?.choices[0]?.message?.content || ""
           
        } catch(err) {
            console.log(err)
        }   
    }


    async initMainModel() {
        try {
            //defined the api key so that it will be picked up automatically
            this.openai = new OpenAI();
                const convo = await this.openai.chat.completions.create({
                  model: 'gpt-3.5-turbo',
                  max_tokens: 100,
                  temperature: 0.5,
                  messages: [
                    { role: 'system', content: `${process.env.TEST_TRAINING_PROMPT}`},

                ],
                });
            

            return convo
           
        } catch(err) {
            console.log(err)
        }   
    }
}

export default Promptservice