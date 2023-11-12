
import OpenAI from "openai";
import PhoneService from "../phoneCalls/PhoneService";
import { clientData } from "../../clientData";

const voice: any = require('elevenlabs-node');

class PromptService extends PhoneService {
    
    public openai: any;
    private conversationHistory: { role: string; content: string; }[];

    constructor() {
        super();
        this.conversationHistory = []; // Initialize the conversation history
    }

    async mainModelPrompt(prompt: string) {
        
        try {
           
            
            // Add the user's prompt to the conversation history
            this.conversationHistory.push({ role: 'user', content: prompt });

            const convo = await this.openai.chat.completions.create({
                model: 'gpt-4-1106-preview',
                max_tokens: 100,
                temperature: 0.3,
                messages: this.conversationHistory, // Pass the conversation history
            });

            // Add the model's response to the conversation history
            if (convo.choices[0].message.content) {
                this.conversationHistory.push({ role: 'assistant', content: convo.choices[0].message.content});
            }
            
            return convo?.choices[0]?.message?.content || "";
           
        } catch(err) {
            console.log(err);
        }   
    }

    async initMainModel(targetNumber:string) {
        console.log(clientData)
        console.log(targetNumber)
        try {
            this.openai = new OpenAI();
            const convo = await this.openai.chat.completions.create({
                model: 'gpt-4-1106-preview',
                max_tokens: 100,
                temperature: 0.4,
                messages: [
                    { role: 'system', content: clientData[targetNumber].systemPrompt()},
                   
                ],
            });

            // Add the initial system message to the conversation history
            
            this.conversationHistory.push({ role: 'system', content: clientData[targetNumber].systemPrompt()})
            this.conversationHistory.push({ role: 'assistant', content: convo.choices[0].message.content + "Keep response short within 50 tokens. Don't start the sentence with Assistant - just the description of what you want to say." });

            return convo;
           
        } catch(err) {
            console.log(err);
        }   
    }
}

export default PromptService;