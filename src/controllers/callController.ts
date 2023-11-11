require('dotenv').config();
import fetch from 'node-fetch';
import express, { Request, Response, Router, NextFunction } from 'express';
import SpeechService from '../services/speechservice/SpeechService';
import { clientData } from '../clientData';
const telnyx = require('telnyx')(process.env.TELNYX_API_KEY);


class CallController extends SpeechService {
    public basePath = '/calls'
    public router: Router = express.Router();
    public mainLanguageModel: any
    public fromNumber: string;
    public toNumber: string;
    public callStates: Record<string, string> = {};


    constructor() {
        super();
        this.initRoutes();
        this.fromNumber=""
        this.toNumber=""
    }

    public initRoutes(): void {
        //receives webhook to start response logic.
        this.router.post(this.basePath + '/call', this.callProcessor.bind(this));
        this.router.get(this.basePath + '/', (res:Response)=> res.send("API online!"));
    }

    
    public async callProcessor(req: Request, res: Response) {
        const data = req.body;

        if (data.data.event_type === "call.hangup") {
          this.callStates[data.data.payload.call_control_id] = 'ended';
      }
  
      // Check call state before processing any event
      if (this.callStates[data.data.payload.call_control_id] === 'ended' && data.data.event_type !== "call.hangup") {
          console.log(`Ignoring event ${data.data.event_type} for ended call ${data.data.payload.call_control_id}`);
          res.status(409).send("Call has already ended");
          return;
      }
        
        try {
        if(data.data.event_type === "call.playback.started" && this.callStates[data.data.payload.call_control_id] !== 'ended') { 
          this.stopTranscription(data.data.payload.call_control_id)
          res.send("OK")
        }
        if(data.data.event_type === "call.playback.ended" && this.callStates[data.data.payload.call_control_id] !== 'ended') { 
          this.startTranscription(data.data.payload.call_control_id, this.fromNumber);
          res.send("OK")
        }
        if(data.data.event_type === "call.transcription" && this.callStates[data.data.payload.call_control_id] !== 'ended') { 
          
          const promptToSpeak = await this.mainModelPrompt(data.data.payload.transcription_data.transcript)
          
          if(promptToSpeak.includes("MENU_REQUESTED")) {
              let triggerToRemove = "MENU_REQUESTED";
              let modifiedString = promptToSpeak.replace(new RegExp(triggerToRemove, 'g'), "");
              this.talk(data.data.payload.call_control_id, modifiedString.trim(), this.fromNumber)
              this.sendTextMessage(this.fromNumber, this.toNumber)
          } else if(promptToSpeak.includes("PERSON_REQUESTED")){
              let triggerToRemove = "PERSON_REQUESTED";
              let modifiedString = promptToSpeak.replace(new RegExp(triggerToRemove, 'g'), "");
              await this.talk(data.data.payload.call_control_id, modifiedString, this.fromNumber)
              await this.transferCall(data.data.payload.call_control_id, "+13234253411")
              this.stopAIAssistant(data.data.payload.call_control_id)
              this.stopTranscription(data.data.payload.call_control_id)
          } else if(promptToSpeak.includes("RESERVATION_REQUESTED_BY_USER")) {
              let triggerToRemove = "RESERVATION_REQUESTED_BY_USER";
              let modifiedString = promptToSpeak.replace(new RegExp(triggerToRemove, 'g'), "");
              this.talk(data.data.payload.call_control_id, modifiedString, this.fromNumber)
          } else {
              this.talk(data.data.payload.call_control_id, promptToSpeak, this.fromNumber)
          }
          res.send("OK")
        }
        if(data.data.event_type === "call.initiated" && this.callStates[data.data.payload.call_control_id] !== 'ended') {
          
          this.mainLanguageModel = await this.initMainModel(data.data.payload.to)
          this.answerCall(data.data.payload.call_control_id)
          res.send("OK")
        }

        if (data.data.event_type === 'call.answered' && this.callStates[data.data.payload.call_control_id] !== 'ended') {
          this.fromNumber=data.data.payload.to
          this.toNumber=data.data.payload.from
          const initMessage = this.mainLanguageModel?.choices[0]?.message?.content
          this.talk(data.data.payload.call_control_id, initMessage, this.fromNumber)
          res.send("OK")
        }

        
        } catch(err) {
          console.log(err)
        }
    }

    
    //answers the phone call
    async answerCall(callControlId: string) {
      
      if (this.callStates[callControlId] === 'ended') {
        console.log(`Cannot talk, call ${callControlId} has ended.`);
        return;
    }

      try {
        const resp = await fetch(
          `https://api.telnyx.com/v2/calls/${callControlId}/actions/answer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.TELNYX_API_KEY}`
            },
            body: JSON.stringify({
              client_state: 'aGF2ZSBhIG5pY2UgZGF5ID1d',
              from_display_name:"Assistant",
              command_id: '891510ac-f3e4-11e8-af5b-de00688a4901',
              send_silence_when_idle: true
            })
          }
        );
        
        const data = await resp.json();
        return data
      } catch(err) {
        console.log(err)
      }  
  }


async startTranscription(callControlId: string, targetNumber:string) {
  if (this.callStates[callControlId] === 'ended') {
    
    return;
  }
  
  try {
    const call = new telnyx.Call({call_control_id: callControlId});
    const transcription = await call.transcription_start({language: clientData[targetNumber].language, transcription_engine: "B", interim_results: true});
    return transcription
  } catch(err){
    
    return err
 }
}

async stopTranscription(callControlId: string) {
  if (this.callStates[callControlId] === 'ended') {
    console.log(`Cannot talk, call ${callControlId} has ended.`);
    return;
  }
  
  try {
    const call = new telnyx.Call({call_control_id: callControlId});
    const transcription = await call.transcription_stop({language: "en", transcription_engine: "B", interim_results: true});
    return transcription
  } catch(err){
    return err
  }
}
 

async talk(callControllId:string, aiMessage: string, targetNumber:string) {

  if (this.callStates[callControllId] === 'ended') {
    console.log(`Cannot talk, call ${callControllId} has ended.`);
    return;
}

  const base64Audio = await this.generateSpeech(aiMessage, targetNumber)
  const call = new telnyx.Call({call_control_id: callControllId});
    try {
      call.playback_start({ playback_content:base64Audio});
    } catch(err) {
      console.log(err)
    }
  }

    async stopAIAssistant(callControlId:string) {

      if (this.callStates[callControlId] === 'ended') {
        console.log(`Cannot talk, call ${callControlId} has ended.`);
        return;
    }

      const call = new telnyx.Call({ call_control_id: callControlId });

      try {
        call.playback_stop();
      } catch(err) {
        console.log(err)
      }
    }

      async sendTextMessage(from:string, to:string) {

        
        const apiUrl = 'https://api.telnyx.com/v2/messages';
        const telnyxApiKey = process.env.TELNYX_API_KEY; // Using the API Key from .env file
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${telnyxApiKey}`
        };

        const body = JSON.stringify({
            'from': from,
            'to': to,
            'text': 'You can find the menu for Mr Chow here: https://www.mrchow.com/order-online/ '
        });

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: body
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Message sent successfully:', data);
            } else {
                console.error('Error sending message:', data);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async transferCall(callControlId:string, destination:string) {
      if (this.callStates[callControlId] === 'ended') {
        console.log(`Cannot talk, call ${callControlId} has ended.`);
        return;
      }
      
      const apiUrl = `https://api.telnyx.com/v2/calls/${callControlId}/actions/transfer`;
      const telnyxApiKey = process.env.TELNYX_API_KEY; // Using the API Key from .env file

      const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${telnyxApiKey}`
      };

      const body = JSON.stringify({
          'to': destination, // The destination number to transfer the call to
      });

      try {
          const response = await fetch(apiUrl, {
              method: 'POST',
              headers: headers,
              body: body
          });

          const data = await response.json();

          if (response.ok) {
              console.log('Call transferred successfully:', data);
          } else {
              console.error('Error transferring call:', data);
          }
      } catch (error) {
          console.error('Error:', error);
      }
  }

  
}




export default CallController;
