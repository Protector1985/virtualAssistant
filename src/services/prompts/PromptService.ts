
import OpenAI from "openai";
import { OpenAIStream, StreamingTextResponse } from 'ai';
import PhoneService from "../phoneCalls/PhoneService";
import { clientData } from "../../clientData";
import SpeechService from "../speechservice/SpeechService";
import CallController from "../../controllers/callController";

const voice: any = require('elevenlabs-node');

class PromptService extends PhoneService {
    
    public openai: any;
    private conversationHistory:any;
    

    constructor() {
        super(); 
    }

    clearConversationHistory(callControlId:string) {
        console.log(`Conversation cleared for ${callControlId}`)
       
        //cleans up the conversation history after a call
        delete this.conversationHistory[callControlId]
    }

    async mainModelPrompt(callControlId:string, prompt: string) {
        try {
            // Add the user's prompt to the conversation history
            this.conversationHistory[callControlId].push({ role: 'user', content: prompt });

            const convo = await this.openai.chat.completions.create({
                model: 'gpt-4-1106-preview',
                stream:true,
                max_tokens: 100,
                temperature: 0.3,
                messages: this.conversationHistory[callControlId], // Pass the conversation history
            });

            const stream = {
                read: async () => {
                    let fullMessage = "";
                    for await (const messageFragment of convo) {
                        if(messageFragment.choices[0].finish_reason !== "stop") {
                            fullMessage += messageFragment.choices[0].delta.content;
                        }
                        
                    }
                    this.conversationHistory[callControlId].push({ role: 'assistant', content: fullMessage });
                    return { message: fullMessage };
                }
            };

            return stream;
           
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
                model: 'gpt-4-1106-preview',
                stream:true,
                max_tokens: 100,
                temperature: 0.4,
                messages: [
                    { role: 'system', content: clientData[targetNumber].systemPrompt()},
                ],
            });

            // Add the initial system message to the conversation history
            this.conversationHistory[callControlId].push({ role: 'system', content: clientData[targetNumber].systemPrompt()})
            // this.conversationHistory[callControlId].push({ role: 'assistant', content: convo.choices[0].message.content + "Keep response short within 50 tokens. Don't start the sentence with Assistant - just the description of what you want to say." });
                
            const stream = {
                read: async () => {
                    let fullMessage = "";
                    for await (const messageFragment of convo) {
                        if(messageFragment.choices[0].finish_reason !== "stop") {
                            fullMessage += messageFragment.choices[0].delta.content;
                        }
                        
                    }
                    this.conversationHistory[callControlId].push({ role: 'assistant', content: fullMessage });
                    return { message: fullMessage };
                }
            };

            return stream;
            
           
        } catch(err) {
            console.log(err);
        }   
    }
}

export default PromptService;