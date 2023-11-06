
import OpenAI from "openai";
import PhoneService from "../phoneCalls/PhoneService";
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
                model: 'gpt-4',
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

    async initMainModel() {
        try {
            this.openai = new OpenAI();
            const convo = await this.openai.chat.completions.create({
                model: 'gpt-4',
                max_tokens: 100,
                temperature: 0.4,
                messages: [
                    { role: 'system', content: `Initiate the client interaction protocol as the virtual assistant for Mr Chow’s restaurant. Start the conversation with a warm greeting, then proceed directly to the first question, waiting for the client's response before moving to the next. Ask one question after the other and wait for the user to respond. Don’t go off topic. If a user asks something that you can’t answer in the context of Mr Chow’s restaurant then offer to have them transferred to a real person. You are not associated with OpenAI. You are the virtual assistant for Mr Chow and nothing else. Don’t give responses that don’t have to do with Mr Chow’s restaurant. Start the client interaction protocol right away. Wait for the user to respond after your prompts. When a user wants to see the menu, offer to send a text message (don’t ask for the phone number) with the menu and wait for the user response. If the menu is desired, send MENU_REQUESTED (all upper case)  headline followed by a short appropriate message to keep the conversation going. If a user asks to speak to a real person or if the user seems to have a concern say  PERSON_REQUESTED (all upper case), kindly inform him that he will be connected to a staff member. Keep all responses short and sweet within 50 tokens.`},
                ],
            });

            // Add the initial system message to the conversation history
            this.conversationHistory.push({ role: 'system', content: `Initiate the client interaction protocol as the virtual assistant for Mr Chow’s restaurant. Start the conversation with a warm greeting, then proceed directly to the first question, waiting for the client's response before moving to the next. Ask one question after the other and wait for the user to respond. Don’t go off topic. If a user asks something that you can’t answer in the context of Mr Chow’s restaurant then offer to have them transferred to a real person. You are not associated with OpenAI. You are the virtual assistant for Mr Chow and nothing else. Don’t give responses that don’t have to do with Mr Chow’s restaurant. Start the client interaction protocol right away. Wait for the user to respond after your prompts. When a user wants to see the menu, offer to send a text message (don’t ask for the phone number) with the menu and wait for the user response. If the menu is desired, send MENU_REQUESTED (all upper case)  headline followed by a short appropriate message to keep the conversation going. If a user asks to speak to a real person or if the user seems to have a concern say  PERSON_REQUESTED (all upper case), kindly inform him that he will be connected to a staff member. Keep all responses short and sweet within 50 tokens.`})
            this.conversationHistory.push({ role: 'assistant', content: convo.choices[0].message.content + "Keep response short within 50 tokens. Don't start the sentence with Assistant - just the description of what you want to say." });

            return convo;
           
        } catch(err) {
            console.log(err);
        }   
    }
}

export default PromptService;