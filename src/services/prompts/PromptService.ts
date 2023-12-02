
import OpenAI from "openai";
import PhoneService from "../phoneCalls/PhoneService";
import moment from 'moment'
import MongoService from "../MongoService";

const voice: any = require('elevenlabs-node');

class PromptService extends PhoneService {
    
    public openai: any;
    private conversationHistory:any;
    private mongoController:any;
    
    constructor(database = new MongoService) {
        super(); 
        this.mongoController = database
    }

    async clearConversationHistory(callControlId:string, clientPhone:string) {
        try {
            const conversationHistory = this.conversationHistory[callControlId].map((item:any) => {
                if(item.role === "assistant" || item.role === "user") {
                    return item
                }
            }).filter((item:any) => item)
            const conversationData = {
                [moment().format("MM-DD-YY hh:mm")]: conversationHistory
            }
            await this.mongoController.addConversationHistory(clientPhone, conversationData)
            //cleans up the conversation history after a call
            delete this.conversationHistory[callControlId]

        } catch(err) {
            console.log(err)
        }
        
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

    async initMainModel(callControlId:string, targetNumber:string, clientData:any) {
      
        try {
            this.conversationHistory = {
                ...this.conversationHistory,
                [callControlId]: []
            }
            
            
            
            this.openai = new OpenAI();
            const convo = await this.openai.chat.completions.create({
                model: 'gpt-4-1106-preview',
                stream:true,
                max_tokens: 100,
                temperature: 0.4,
                messages: [
                    { role: 'system', content: clientData.systemPrompt},
                ],
            });

            // Add the initial system message to the conversation history
            this.conversationHistory[callControlId].push({ role: 'system', content: clientData.systemPrompt})
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