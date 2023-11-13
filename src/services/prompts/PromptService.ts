
import OpenAI from "openai";
import PhoneService from "../phoneCalls/PhoneService";
import { clientData } from "../../clientData";

const voice: any = require('elevenlabs-node');

class PromptService extends PhoneService {
    
    public openai: any;
    private conversationHistory:any;

    constructor() {
        super(); 
    }

    async mainModelPrompt(callControlId:string, prompt: string) {
        
        try {
            // Add the user's prompt to the conversation history
            this.conversationHistory[callControlId].push({ role: 'user', content: prompt });

            const convo = await this.openai.chat.completions.create({
                model: 'gpt-4',
                max_tokens: 100,
                temperature: 0.3,
                messages: this.conversationHistory[callControlId], // Pass the conversation history
            });

            // Add the model's response to the conversation history
            if (convo.choices[0].message.content) {
                this.conversationHistory[callControlId].push({ role: 'assistant', content: convo.choices[0].message.content});
            }
            
            return convo?.choices[0]?.message?.content || "";
           
        } catch(err) {
            console.log(err);
        }   
    }

    async initMainModel(callControlId:string, targetNumber:string) {
      
        try {
            this.conversationHistory = {
                [callControlId]: []
            }
            
            this.openai = new OpenAI();
            const convo = await this.openai.chat.completions.create({
                model: 'gpt-4',
                max_tokens: 100,
                temperature: 0.4,
                messages: [
                    { role: 'system', content: clientData[targetNumber].systemPrompt()},
                ],
            });

            // Add the initial system message to the conversation history
            this.conversationHistory[callControlId].push({ role: 'system', content: clientData[targetNumber].systemPrompt()})
            this.conversationHistory[callControlId].push({ role: 'assistant', content: convo.choices[0].message.content + "Keep response short within 50 tokens. Don't start the sentence with Assistant - just the description of what you want to say." });

            return convo;
           
        } catch(err) {
            console.log(err);
        }   
    }
}

export default PromptService;